import {
  CreateChatInputSchema,
  CreateProviderConfigInputSchema,
  LiveStreamRequestSchema,
  LoginRequestSchema,
  PromptPreviewSchema,
  type Preset,
  ProviderListResponseSchema,
  ProviderModelsResponseSchema,
  SessionResponseSchema,
  StreamEventSchema,
  type Character,
  type Chat,
  type ProviderConfig,
} from '@forward/shared';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';

import { clearSessionCookie, isAuthenticated, issueSessionCookie, requireAuth } from './auth';
import { importCharacterFile } from './character-import';
import type { AppConfig } from './config';
import { createMockStreamEvents, mockPromptPreview } from './mock-data';
import { buildPromptPreview } from './prompting';
import type { AppDependencies } from './runtime';

async function writeStreamEvent(
  stream: Parameters<typeof streamSSE>[1] extends (stream: infer T) => Promise<void> ? T : never,
  event: unknown,
) {
  const validatedEvent = StreamEventSchema.parse(event);

  await stream.writeSSE({
    data: JSON.stringify(validatedEvent),
    event: validatedEvent.type,
  });
}

function isAllowedOrigin(origin: string | undefined, configuredOrigin: string): string | null {
  if (!origin) {
    return configuredOrigin;
  }

  const allowedOrigins = new Set([
    configuredOrigin,
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:4173',
    'http://localhost:4173',
  ]);

  return allowedOrigins.has(origin) ? origin : null;
}

const GenerateChatRouteSchema = z.object({
  content: z.string().min(1),
  maxOutputTokens: z.number().int().positive().max(512).optional(),
  providerConfigId: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const CreateCharacterRouteSchema = z.object({
  avatarAssetPath: z.string().nullable().optional(),
  description: z.string().default(''),
  exampleDialogue: z.string().default(''),
  firstMessage: z.string().default(''),
  name: z.string().min(1),
  personality: z.string().default(''),
  scenario: z.string().default(''),
});

const UpdateCharacterRouteSchema = CreateCharacterRouteSchema.partial().extend({
  name: z.string().min(1).optional(),
});

const UpdateChatRouteSchema = z
  .object({
    characterId: z.string().min(1).nullable().optional(),
    presetId: z.string().min(1).nullable().optional(),
    providerConfigId: z.string().min(1).nullable().optional(),
    title: z.string().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be updated');

const CreateMessageRouteSchema = z.object({
  content: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']).default('user'),
});

const CreatePresetRouteSchema = z.object({
  maxOutputTokens: z.number().int().positive(),
  name: z.string().min(1),
  stopStrings: z.array(z.string()),
  temperature: z.number().min(0).max(2),
  topK: z.number().int().nonnegative(),
  topP: z.number().min(0).max(1),
});

const UpdatePresetRouteSchema = CreatePresetRouteSchema.partial().extend({
  name: z.string().min(1).optional(),
});

async function getRequiredChat(dependencies: AppDependencies, chatId: string): Promise<Chat> {
  const chat = await dependencies.chats.getById(chatId);

  if (!chat) {
    throw new Error('Chat not found');
  }

  return chat;
}

async function getRequiredCharacter(dependencies: AppDependencies, characterId: string): Promise<Character> {
  const character = await dependencies.characters.getById(characterId);

  if (!character) {
    throw new Error('Character not found');
  }

  return character;
}

async function resolveProviderConfig(
  dependencies: AppDependencies,
  chat: Chat,
  providerConfigId?: string,
): Promise<ProviderConfig | null> {
  if (providerConfigId) {
    return dependencies.providerConfigs.getById(providerConfigId);
  }

  if (chat.providerConfigId) {
    return dependencies.providerConfigs.getById(chat.providerConfigId);
  }

  return (await dependencies.providerConfigs.list())[0] ?? null;
}

async function resolvePreset(
  dependencies: AppDependencies,
  chat: Chat,
  presetId?: string,
): Promise<Preset | null> {
  if (presetId) {
    return dependencies.presets.getById(presetId);
  }

  if (chat.presetId) {
    return dependencies.presets.getById(chat.presetId);
  }

  return (await dependencies.presets.list())[0] ?? null;
}

export function createApp(config: AppConfig, dependencies: AppDependencies) {
  const app = new Hono();

  app.use(
    '*',
    cors({
      allowHeaders: ['Content-Type'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      origin: (origin) => isAllowedOrigin(origin, config.webOrigin) ?? config.webOrigin,
    }),
  );

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.get('/auth/session', async (c) => {
    const payload = SessionResponseSchema.parse({
      authenticated: await isAuthenticated(c, config),
    });

    return c.json(payload);
  });

  app.post('/auth/login', async (c) => {
    const requestBody = LoginRequestSchema.parse(await c.req.json());

    if (requestBody.password !== config.appPassword) {
      return c.json({ error: 'Invalid password' }, 401);
    }

    await issueSessionCookie(c, config);

    return c.body(null, 204);
  });

  app.post('/auth/logout', (c) => {
    clearSessionCookie(c);

    return c.body(null, 204);
  });

  app.use('/providers', requireAuth(config));
  app.use('/providers/*', requireAuth(config));
  app.use('/presets', requireAuth(config));
  app.use('/presets/*', requireAuth(config));
  app.use('/characters', requireAuth(config));
  app.use('/characters/*', requireAuth(config));
  app.use('/chats', requireAuth(config));
  app.use('/chats/*', requireAuth(config));
  app.use('/debug/*', requireAuth(config));

  app.get('/characters', async (c) => c.json(await dependencies.characters.list()));

  app.post('/characters', async (c) => {
    const input = CreateCharacterRouteSchema.parse(await c.req.json());
    const character = await dependencies.characters.create(input);

    return c.json(character, 201);
  });

  app.post('/characters/import', async (c) => {
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return c.json({ error: 'Import file is required' }, 400);
    }

    const input = await importCharacterFile(config, file);
    const character = await dependencies.characters.create(input);

    return c.json(character, 201);
  });

  app.patch('/characters/:characterId', async (c) => {
    try {
      await getRequiredCharacter(dependencies, c.req.param('characterId'));
      const input = UpdateCharacterRouteSchema.parse(await c.req.json());
      const character = await dependencies.characters.update(c.req.param('characterId'), input);

      return c.json(character);
    } catch (error) {
      if (error instanceof Error && error.message === 'Character not found') {
        return c.json({ error: error.message }, 404);
      }

      throw error;
    }
  });

  app.delete('/characters/:characterId', async (c) => {
    await dependencies.characters.delete(c.req.param('characterId'));

    return c.body(null, 204);
  });

  app.get('/media/avatars/*', async (c) => {
    const filePath = resolve(config.mediaRoot, c.req.path.replace('/media/', ''));

    if (!filePath.startsWith(resolve(config.mediaRoot))) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    if (!existsSync(filePath)) {
      return c.json({ error: 'Not found' }, 404);
    }

    const buffer = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };

    return new Response(buffer, { headers: { 'content-type': mimeTypes[ext] ?? 'application/octet-stream' } });
  });

  app.get('/providers', async (c) => {
    const payload = ProviderListResponseSchema.parse({
      providers: await dependencies.providerConfigs.list(),
    });

    return c.json(payload);
  });

  app.post('/providers', async (c) => {
    const input = CreateProviderConfigInputSchema.parse(await c.req.json());
    const providerConfig = await dependencies.providerConfigs.create(input);

    return c.json(providerConfig, 201);
  });

  app.patch('/providers/:providerId', async (c) => {
    const input = CreateProviderConfigInputSchema.partial().extend({
      name: z.string().min(1).optional(),
    }).parse(await c.req.json());
    const providerConfig = await dependencies.providerConfigs.update(c.req.param('providerId'), input);

    return c.json(providerConfig);
  });

  app.delete('/providers/:providerId', async (c) => {
    await dependencies.providerConfigs.delete(c.req.param('providerId'));

    return c.body(null, 204);
  });

  app.get('/providers/:providerId/models', async (c) => {
    const providerConfig = await dependencies.providerConfigs.getById(c.req.param('providerId'));

    if (!providerConfig) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    const models = await dependencies.createProviderAdapter(providerConfig).listModels();
    const payload = ProviderModelsResponseSchema.parse({ models });

    return c.json(payload);
  });

  app.get('/presets', async (c) => c.json(await dependencies.presets.list()));

  app.post('/presets', async (c) => {
    const input = CreatePresetRouteSchema.parse(await c.req.json());
    const preset = await dependencies.presets.create(input);

    return c.json(preset, 201);
  });

  app.patch('/presets/:presetId', async (c) => {
    const input = UpdatePresetRouteSchema.parse(await c.req.json());
    const preset = await dependencies.presets.update(c.req.param('presetId'), input);

    return c.json(preset);
  });

  app.delete('/presets/:presetId', async (c) => {
    await dependencies.presets.delete(c.req.param('presetId'));

    return c.body(null, 204);
  });

  app.get('/chats', async (c) => c.json(await dependencies.chats.list()));

  app.post('/chats', async (c) => {
    const input = CreateChatInputSchema.parse(await c.req.json());
    const chat = await dependencies.chats.create(input);

    return c.json(chat, 201);
  });

  app.patch('/chats/:chatId', async (c) => {
    try {
      await getRequiredChat(dependencies, c.req.param('chatId'));
      const input = UpdateChatRouteSchema.parse(await c.req.json());
      const chat = await dependencies.chats.update(c.req.param('chatId'), input);

      return c.json(chat);
    } catch (error) {
      if (error instanceof Error && error.message === 'Chat not found') {
        return c.json({ error: error.message }, 404);
      }

      throw error;
    }
  });

  app.delete('/chats/:chatId', async (c) => {
    await dependencies.chats.delete(c.req.param('chatId'));

    return c.body(null, 204);
  });

  app.post('/chats/:chatId/messages', async (c) => {
    try {
      const chat = await getRequiredChat(dependencies, c.req.param('chatId'));
      const input = CreateMessageRouteSchema.parse(await c.req.json());
      const message = await dependencies.messages.create({
        chatId: chat.id,
        content: input.content,
        role: input.role,
      });

      return c.json(message, 201);
    } catch (error) {
      if (error instanceof Error && error.message === 'Chat not found') {
        return c.json({ error: error.message }, 404);
      }

      throw error;
    }
  });

  app.get('/chats/:chatId/messages', async (c) => {
    const chat = await dependencies.chats.getById(c.req.param('chatId'));

    if (!chat) {
      return c.json({ error: 'Chat not found' }, 404);
    }

    return c.json(await dependencies.messages.listByChatId(chat.id));
  });

  app.get('/chats/:chatId/prompt-preview', async (c) => {
    try {
      const chat = await getRequiredChat(dependencies, c.req.param('chatId'));
      const providerConfig = await resolveProviderConfig(dependencies, chat);
      const preset = await resolvePreset(dependencies, chat);

      if (!providerConfig || !preset) {
        return c.json({ error: !providerConfig ? 'Provider not found' : 'Preset not found' }, 404);
      }

      const character = chat.characterId ? await dependencies.characters.getById(chat.characterId) : null;
      const messages = await dependencies.messages.listByChatId(chat.id);
      const preview = buildPromptPreview({
        character,
        chatId: chat.id,
        config,
        messages,
        preset,
        provider: providerConfig,
      });

      return c.json(PromptPreviewSchema.parse(preview));
    } catch (error) {
      if (error instanceof Error && error.message === 'Chat not found') {
        return c.json({ error: error.message }, 404);
      }

      throw error;
    }
  });

  app.post('/chats/:chatId/generate', async (c) => {
    try {
      const chat = await getRequiredChat(dependencies, c.req.param('chatId'));
      const request = GenerateChatRouteSchema.parse(await c.req.json());
      const providerConfig = await resolveProviderConfig(dependencies, chat, request.providerConfigId);
      const preset = await resolvePreset(dependencies, chat);

      if (!providerConfig || !preset) {
        return c.json({ error: !providerConfig ? 'Provider not found' : 'Preset not found' }, 404);
      }

      await dependencies.messages.create({
        chatId: chat.id,
        content: request.content,
        role: 'user',
      });
      const history = await dependencies.messages.listByChatId(chat.id);
      const character = chat.characterId ? await dependencies.characters.getById(chat.characterId) : null;
      const promptPreview = buildPromptPreview({
        character,
        chatId: chat.id,
        config,
        messages: history,
        preset,
        provider: providerConfig,
      });
      const assistantMessage = await dependencies.messages.create({
        chatId: chat.id,
        content: '',
        reasoningContent: '',
        role: 'assistant',
        state: 'streaming',
      });
      const adapter = dependencies.createProviderAdapter(providerConfig);

      return streamSSE(c, async (stream) => {
        let completed = false;

        await writeStreamEvent(stream, {
          chatId: chat.id,
          messageId: assistantMessage.id,
          type: 'response.started',
        });

        try {
          for await (const chunk of adapter.streamGenerate({
            maxOutputTokens: request.maxOutputTokens ?? preset.maxOutputTokens,
            messages: promptPreview.messages,
            model: providerConfig.model,
            stop: preset.stopStrings,
            temperature: request.temperature ?? preset.temperature,
            topP: preset.topP,
          })) {
            if (chunk.kind === 'reasoning' && chunk.text) {
              await dependencies.messages.appendReasoning(assistantMessage.id, chunk.text);
              await writeStreamEvent(stream, {
                chatId: chat.id,
                messageId: assistantMessage.id,
                text: chunk.text,
                type: 'reasoning.delta',
              });
            }

            if (chunk.kind === 'content' && chunk.text) {
              await dependencies.messages.appendContent(assistantMessage.id, chunk.text);
              await writeStreamEvent(stream, {
                chatId: chat.id,
                messageId: assistantMessage.id,
                text: chunk.text,
                type: 'content.delta',
              });
            }

            if (chunk.kind === 'done' && !completed) {
              completed = true;
              await dependencies.messages.updateState(assistantMessage.id, 'completed');
              await writeStreamEvent(stream, {
                chatId: chat.id,
                messageId: assistantMessage.id,
                type: 'response.completed',
              });
            }
          }

          if (!completed) {
            await dependencies.messages.updateState(assistantMessage.id, 'completed');
            await writeStreamEvent(stream, {
              chatId: chat.id,
              messageId: assistantMessage.id,
              type: 'response.completed',
            });
          }
        } catch (error) {
          await dependencies.messages.updateState(assistantMessage.id, 'failed');
          await writeStreamEvent(stream, {
            chatId: chat.id,
            error: error instanceof Error ? error.message : 'Unknown provider error',
            messageId: assistantMessage.id,
            type: 'response.error',
          });
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Chat not found') {
        return c.json({ error: error.message }, 404);
      }

      throw error;
    }
  });

  app.get('/debug/prompt-preview', (c) => c.json(PromptPreviewSchema.parse(mockPromptPreview)));

  app.get('/debug/mock-stream', (c) => {
    const events = createMockStreamEvents();

    return streamSSE(c, async (stream) => {
      for (const event of events) {
        await writeStreamEvent(stream, event);
      }
    });
  });

  app.post('/debug/live-stream', async (c) => {
    const request = LiveStreamRequestSchema.parse(await c.req.json());
    const providerConfig = request.providerConfigId
      ? await dependencies.providerConfigs.getById(request.providerConfigId)
      : (await dependencies.providerConfigs.list())[0] ?? null;

    if (!providerConfig) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    const adapter = dependencies.createProviderAdapter(providerConfig);
    const chatId = `debug_${providerConfig.id}`;
    const messageId = crypto.randomUUID();

    return streamSSE(c, async (stream) => {
      let completed = false;

      await writeStreamEvent(stream, {
        chatId,
        messageId,
        type: 'response.started',
      });

      try {
        for await (const chunk of adapter.streamGenerate({
          maxOutputTokens: request.maxOutputTokens,
          messages: [{ content: request.prompt, role: 'user' }],
          temperature: request.temperature,
        })) {
          if (chunk.kind === 'reasoning' && chunk.text) {
            await writeStreamEvent(stream, {
              chatId,
              messageId,
              text: chunk.text,
              type: 'reasoning.delta',
            });
          }

          if (chunk.kind === 'content' && chunk.text) {
            await writeStreamEvent(stream, {
              chatId,
              messageId,
              text: chunk.text,
              type: 'content.delta',
            });
          }

          if (chunk.kind === 'done' && !completed) {
            completed = true;
            await writeStreamEvent(stream, {
              chatId,
              messageId,
              type: 'response.completed',
            });
          }
        }

        if (!completed) {
          await writeStreamEvent(stream, {
            chatId,
            messageId,
            type: 'response.completed',
          });
        }
      } catch (error) {
        await writeStreamEvent(stream, {
          chatId,
          error: error instanceof Error ? error.message : 'Unknown provider error',
          messageId,
          type: 'response.error',
        });
      }
    });
  });

  return app;
}
