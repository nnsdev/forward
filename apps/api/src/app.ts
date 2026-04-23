import {
  AppSettingsSchema,
  CharacterSchema,
  ChatSchema,
  CreateCharacterInputSchema,
  CreateChatInputSchema,
  CreatePresetInputSchema,
  CreateProviderConfigInputSchema,
  GenerateChatInputSchema,
  LoginRequestSchema,
  MessageSchema,
  ProviderListResponseSchema,
  ProviderModelsResponseSchema,
  PromptPreviewSchema,
  LiveStreamRequestSchema,
  RetryChatInputSchema,
  SessionResponseSchema,
  StreamEventSchema,
  UpdateAppSettingsInputSchema,
  UpdateChatInputSchema,
  UpdateMessageContentSchema,
  UpdateProviderConfigInputSchema,
} from '@forward/shared';
import type { Character, Chat, Preset, ProviderConfig } from '@forward/shared';
import type { ProviderChunk } from '@forward/provider-core';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';

import { clearSessionCookie, isAuthenticated, issueSessionCookie, requireAuth } from './auth';
import { importCharacterFile } from './character-import';
import type { AppConfig } from './config';
import { createMockStreamEvents, mockPromptPreview } from './mock-data';
import { importPresetTemplateFile } from './preset-import';
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

async function forwardAssistantStream(
  stream: Parameters<typeof streamSSE>[1] extends (stream: infer T) => Promise<void> ? T : never,
  dependencies: AppDependencies,
  chatId: string,
  messageId: string,
  chunks: AsyncIterable<ProviderChunk>,
): Promise<void> {
  let completed = false;

  await writeStreamEvent(stream, {
    chatId,
    messageId,
    type: 'response.started',
  });

  try {
    for await (const chunk of chunks) {
      if (chunk.kind === 'reasoning' && chunk.text) {
        await dependencies.messages.appendReasoning(messageId, chunk.text);
        await writeStreamEvent(stream, {
          chatId,
          messageId,
          text: chunk.text,
          type: 'reasoning.delta',
        });
      }

      if (chunk.kind === 'content' && chunk.text) {
        await dependencies.messages.appendContent(messageId, chunk.text);
        await writeStreamEvent(stream, {
          chatId,
          messageId,
          text: chunk.text,
          type: 'content.delta',
        });
      }

      if (chunk.kind === 'done' && !completed) {
        completed = true;
        await dependencies.messages.updateState(messageId, 'completed');
        await writeStreamEvent(stream, {
          chatId,
          messageId,
          type: 'response.completed',
        });
      }
    }

    if (!completed) {
      await dependencies.messages.updateState(messageId, 'completed');
      await writeStreamEvent(stream, {
        chatId,
        messageId,
        type: 'response.completed',
      });
    }
  } catch (error) {
    await dependencies.messages.updateState(messageId, 'failed');
    await writeStreamEvent(stream, {
      chatId,
      error: error instanceof Error ? error.message : 'Unknown provider error',
      messageId,
      type: 'response.error',
    });
  }
}

function isAllowedOrigin(origin: string | undefined, configuredOrigins: string[]): string | null {
  if (!origin) {
    return configuredOrigins[0] ?? null;
  }

  const allowedOrigins = new Set([
    ...configuredOrigins,
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:4173',
    'http://localhost:4173',
  ]);

  return allowedOrigins.has(origin) ? origin : null;
}

function sanitizeFileStem(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'persona';
}

async function persistAvatar(config: AppConfig, filename: string, buffer: Buffer): Promise<string> {
  const avatarDir = resolve(config.mediaRoot, 'avatars');

  await mkdir(avatarDir, { recursive: true });

  const extension = extname(filename) || '.png';
  const finalName = `${sanitizeFileStem(basename(filename, extension))}-${crypto.randomUUID()}${extension}`;
  const fullPath = join(avatarDir, finalName);

  await writeFile(fullPath, buffer);

  return fullPath;
}

const GenerateChatRouteSchema = z.object({
  content: z.string().min(1),
  maxOutputTokens: z.number().int().positive().max(1024).optional(),
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

const RetryChatRouteSchema = z.object({
  maxOutputTokens: z.number().int().positive().max(1024).optional(),
  providerConfigId: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const CONTINUE_PROMPT = 'Continue the previous response exactly where you left off. Do not repeat yourself. Do not restart the answer.';

const CreateMessageRouteSchema = z.object({
  content: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']).default('user'),
});

const UpdatePresetRouteSchema = CreatePresetInputSchema.partial().extend({
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

function buildGenerationInput(
  promptPreview: ReturnType<typeof buildPromptPreview>,
  preset: Preset,
  providerConfig: ProviderConfig,
  overrides: {
    maxOutputTokens?: number;
    temperature?: number;
  },
) {
  const baseInput = {
    contextLength: preset.contextLength,
    frequencyPenalty: preset.frequencyPenalty,
    maxOutputTokens: overrides.maxOutputTokens ?? preset.maxOutputTokens,
    minP: preset.minP,
    model: providerConfig.model,
    presencePenalty: preset.presencePenalty,
    repeatPenalty: preset.repeatPenalty,
    seed: preset.seed,
    stop: preset.stopStrings,
    temperature: overrides.temperature ?? preset.temperature,
    thinkingBudgetTokens: preset.thinkingBudgetTokens,
    topK: preset.topK,
    topP: preset.topP,
  };

  return preset.instructTemplate
    ? {
      ...baseInput,
      prompt: promptPreview.formattedPrompt,
    }
    : {
      ...baseInput,
      messages: promptPreview.messages,
    };
}

function getActiveConversationMessages<T extends { isActiveAttempt?: boolean; role: string }>(messages: T[]): T[] {
  return messages.filter((message) => message.role !== 'assistant' || message.isActiveAttempt !== false);
}

export function createApp(config: AppConfig, dependencies: AppDependencies) {
  const app = new Hono();

  app.use(
    '*',
    cors({
      allowHeaders: ['Content-Type'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      origin: (origin) => isAllowedOrigin(origin, config.webOrigins) ?? config.webOrigins[0] ?? '',
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

  app.post('/auth/change-password', requireAuth(config), async (c) => {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const currentPassword = String(body.currentPassword ?? '');
    const newPassword = String(body.newPassword ?? '');

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'currentPassword and newPassword are required' }, 400);
    }

    if (currentPassword !== config.appPassword) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    config.appPassword = newPassword;

    return c.json({ ok: true });
  });

  app.use('/providers', requireAuth(config));
  app.use('/providers/*', requireAuth(config));
  app.use('/presets', requireAuth(config));
  app.use('/presets/*', requireAuth(config));
  app.use('/characters', requireAuth(config));
  app.use('/characters/*', requireAuth(config));
  app.use('/chats', requireAuth(config));
  app.use('/chats/*', requireAuth(config));
  app.use('/messages', requireAuth(config));
  app.use('/messages/*', requireAuth(config));
  app.use('/settings', requireAuth(config));
  app.use('/settings/*', requireAuth(config));
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

  app.get('/settings', async (c) => {
    const settings = await dependencies.appSettings.get();

    return c.json(AppSettingsSchema.parse(settings));
  });

  app.patch('/settings', async (c) => {
    const input = UpdateAppSettingsInputSchema.parse(await c.req.json());
    const settings = await dependencies.appSettings.update(input);

    return c.json(settings);
  });

  app.post('/settings/persona-avatar', async (c) => {
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return c.json({ error: 'Avatar file is required' }, 400);
    }

    const avatarAssetPath = await persistAvatar(config, file.name || 'persona.png', Buffer.from(await file.arrayBuffer()));
    const settings = await dependencies.appSettings.update({ personaAvatarAssetPath: avatarAssetPath });

    return c.json(settings);
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
    const input = CreatePresetInputSchema.parse(await c.req.json());
    const preset = await dependencies.presets.create(input);

    return c.json(preset, 201);
  });

  app.post('/presets/import', async (c) => {
    const formData = await c.req.formData();
    const file = formData.get('file');
    const presetId = formData.get('presetId');

    if (!(file instanceof File)) {
      return c.json({ error: 'Import file is required' }, 400);
    }

    const existingPreset = typeof presetId === 'string' && presetId
      ? await dependencies.presets.getById(presetId)
      : null;

    if (typeof presetId === 'string' && presetId && !existingPreset) {
      return c.json({ error: 'Preset not found' }, 404);
    }

    const basePreset = existingPreset ?? (await dependencies.presets.list())[0] ?? null;

    try {
      const input = await importPresetTemplateFile(config, file, existingPreset ?? null);

      if (existingPreset && typeof presetId === 'string') {
        const preset = await dependencies.presets.update(presetId, input);
        return c.json(preset);
      }

      const createInput = {
        ...(basePreset ?? {}),
        ...input,
      };
      const preset = await dependencies.presets.create(CreatePresetInputSchema.parse(createInput));

      return c.json(preset, 201);
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Failed to import preset template' }, 400);
    }
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
      const settings = await dependencies.appSettings.get();
      const messages = await dependencies.messages.listByChatId(chat.id);
      const preview = buildPromptPreview({
        character,
        chatId: chat.id,
        config,
        messages,
        preset,
        provider: providerConfig,
        settings,
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
      const settings = await dependencies.appSettings.get();
      const promptPreview = buildPromptPreview({
        character,
        chatId: chat.id,
        config,
        messages: history,
        preset,
        provider: providerConfig,
        settings,
      });
      const assistantMessage = await dependencies.messages.create({
        chatId: chat.id,
        content: '',
        reasoningContent: '',
        role: 'assistant',
        state: 'streaming',
      });
      const adapter = dependencies.createProviderAdapter(providerConfig);

      return streamSSE(c, async (stream) => forwardAssistantStream(
        stream,
        dependencies,
        chat.id,
        assistantMessage.id,
        adapter.streamGenerate(buildGenerationInput(promptPreview, preset, providerConfig, {
          maxOutputTokens: request.maxOutputTokens,
          temperature: request.temperature,
        })),
      ));
    } catch (error) {
      if (error instanceof Error && error.message === 'Chat not found') {
        return c.json({ error: error.message }, 404);
      }

      throw error;
    }
  });

  app.delete('/messages/:messageId', async (c) => {
    await dependencies.messages.delete(c.req.param('messageId'));

    return c.body(null, 204);
  });

  app.patch('/messages/:messageId', async (c) => {
    const input = UpdateMessageContentSchema.parse(await c.req.json());
    const message = await dependencies.messages.updateContent(c.req.param('messageId'), input.content);

    return c.json(message);
  });

  app.post('/messages/:messageId/select-attempt', async (c) => {
    const message = await dependencies.messages.setActiveAttempt(c.req.param('messageId'));

    return c.json(message);
  });

  app.post('/chats/:chatId/retry', async (c) => {
    try {
      const chat = await getRequiredChat(dependencies, c.req.param('chatId'));
      const request = RetryChatRouteSchema.parse(await c.req.json());
      const allMessages = await dependencies.messages.listByChatId(chat.id);
      const activeMessages = getActiveConversationMessages(allMessages);
      const lastAssistant = [...activeMessages].reverse().find((message) => message.role === 'assistant');

      if (!lastAssistant) {
        return c.json({ error: 'No assistant message to retry' }, 400);
      }

      const retryGroupId = lastAssistant.attemptGroupId ?? lastAssistant.id;
      const history = allMessages.filter((message) => message.id !== lastAssistant.id && message.attemptGroupId !== retryGroupId);
      const providerConfig = await resolveProviderConfig(dependencies, chat, request.providerConfigId);
      const preset = await resolvePreset(dependencies, chat);

      if (!providerConfig || !preset) {
        return c.json({ error: !providerConfig ? 'Provider not found' : 'Preset not found' }, 404);
      }

      const character = chat.characterId ? await dependencies.characters.getById(chat.characterId) : null;
      const settings = await dependencies.appSettings.get();
      const promptPreview = buildPromptPreview({
        character,
        chatId: chat.id,
        config,
        messages: history,
        preset,
        provider: providerConfig,
        settings,
      });
      const assistantMessage = await dependencies.messages.create({
        attemptGroupId: retryGroupId,
        attemptIndex: lastAssistant.attemptIndex + 1,
        chatId: chat.id,
        content: '',
        isActiveAttempt: true,
        reasoningContent: '',
        role: 'assistant',
        state: 'streaming',
      });
      await dependencies.messages.setActiveAttempt(assistantMessage.id);
      const adapter = dependencies.createProviderAdapter(providerConfig);

      return streamSSE(c, async (stream) => forwardAssistantStream(
        stream,
        dependencies,
        chat.id,
        assistantMessage.id,
        adapter.streamGenerate(buildGenerationInput(promptPreview, preset, providerConfig, {
          maxOutputTokens: request.maxOutputTokens,
          temperature: request.temperature,
        })),
      ));
    } catch (error) {
      if (error instanceof Error && error.message === 'Chat not found') {
        return c.json({ error: error.message }, 404);
      }

      throw error;
    }
  });

  app.post('/chats/:chatId/continue', async (c) => {
    try {
      const chat = await getRequiredChat(dependencies, c.req.param('chatId'));
      const request = RetryChatRouteSchema.parse(await c.req.json());
      const history = await dependencies.messages.listByChatId(chat.id);
      const activeMessages = getActiveConversationMessages(history);
      const lastMessage = activeMessages.at(-1);

      if (!lastMessage || lastMessage.role !== 'assistant') {
        return c.json({ error: 'No assistant message to continue' }, 400);
      }

      const providerConfig = await resolveProviderConfig(dependencies, chat, request.providerConfigId);
      const preset = await resolvePreset(dependencies, chat);

      if (!providerConfig || !preset) {
        return c.json({ error: !providerConfig ? 'Provider not found' : 'Preset not found' }, 404);
      }

      const character = chat.characterId ? await dependencies.characters.getById(chat.characterId) : null;
      const settings = await dependencies.appSettings.get();
      const promptPreview = buildPromptPreview({
        character,
        chatId: chat.id,
        config,
        messages: [
          ...history,
          {
            attemptGroupId: null,
            attemptIndex: 0,
            chatId: chat.id,
            content: CONTINUE_PROMPT,
            createdAt: new Date().toISOString(),
            id: 'continue_prompt',
            isActiveAttempt: true,
            reasoningContent: '',
            role: 'user',
            state: 'completed',
            updatedAt: new Date().toISOString(),
          },
        ],
        preset,
        provider: providerConfig,
        settings,
      });

      await dependencies.messages.updateState(lastMessage.id, 'streaming');
      const adapter = dependencies.createProviderAdapter(providerConfig);

      return streamSSE(c, async (stream) => forwardAssistantStream(
        stream,
        dependencies,
        chat.id,
        lastMessage.id,
        adapter.streamGenerate(buildGenerationInput(promptPreview, preset, providerConfig, {
          maxOutputTokens: request.maxOutputTokens,
          temperature: request.temperature,
        })),
      ));
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
