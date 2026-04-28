import type { PromptPreview } from '@forward/shared';
import {
  AppSettingsSchema,
  CharacterSchema,
  ChatSchema,
  CreateCharacterInputSchema,
  CreateCharacterStateInputSchema,
  CreateChatInputSchema,
  CreatePresetInputSchema,
  CreateProviderConfigInputSchema,
  CreateSceneInputSchema,
  GenerateChatInputSchema,
  LoginRequestSchema,
  MessageSchema,
  ProviderListResponseSchema,
  ProviderModelsResponseSchema,
  PromptPreviewSchema,
  LiveStreamRequestSchema,
  RetryChatInputSchema,
  SceneSchema,
  CharacterStateSchema,
  SessionResponseSchema,
  StreamEventSchema,
  UpdateAppSettingsInputSchema,
  UpdateChatInputSchema,
  UpdateMessageContentSchema,
  UpdateProviderConfigInputSchema,
  UpdateSceneInputSchema,
  UpdateCharacterStateInputSchema,
} from '@forward/shared';
import type { Character, Chat, Preset, ProviderConfig } from '@forward/shared';
import type { ProviderAdapter, ProviderChunk } from '@forward/provider-core';
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
import { createReasoningExtractor } from './reasoning-extractor';
import type { AppDependencies } from './runtime';

const webDistRoot = resolve('apps/web/dist');

const staticContentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

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

const SUMMARY_BATCH_SIZE = 8;
const SUMMARY_MAX_TOKENS = 200;
const SUMMARY_MIN_TOKENS = 2500;

async function maybeSummarizeChat(
  dependencies: AppDependencies,
  chatId: string,
  adapter: ProviderAdapter,
): Promise<void> {
  try {
    const allMessages = await dependencies.messages.listByChatId(chatId);
    const coveredIds = new Set<string>();

    for (const message of allMessages) {
      for (const id of message.summaryOf) {
        coveredIds.add(id);
      }
    }

    const uncovered = allMessages.filter((message) => !coveredIds.has(message.id));

    if (uncovered.length < SUMMARY_BATCH_SIZE) {
      return;
    }

    const toSummarize = uncovered.slice(0, SUMMARY_BATCH_SIZE);
    const transcript = toSummarize
      .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
      .join('\n\n');

    if ((await adapter.countTokens(transcript)) < SUMMARY_MIN_TOKENS) {
      return;
    }

    const targetIds = new Set(toSummarize.map((message) => message.id));
    const existingSummary = allMessages.find((message) =>
      message.summaryOf.length === toSummarize.length
      && message.summaryOf.every((id) => targetIds.has(id)),
    );

    if (existingSummary) {
      return;
    }

    const summaryPrompt = `Summarize the following conversation concisely. Include key events, decisions, and emotional beats. Do not add meta-commentary.\n\n${transcript}`;
    let summaryText = '';

    for await (const chunk of adapter.streamGenerate({
      maxOutputTokens: SUMMARY_MAX_TOKENS,
      messages: [{ content: summaryPrompt, role: 'user' }],
      temperature: 0.3,
    })) {
      if (chunk.kind === 'content' && chunk.text) {
        summaryText += chunk.text;
      }
    }

    summaryText = summaryText.trim();

    if (!summaryText) {
      return;
    }

    await dependencies.messages.create({
      chatId,
      content: summaryText,
      role: 'system',
      summaryOf: toSummarize.map((message) => message.id),
    });
  } catch {
    // Silently ignore summary failures
  }
}

interface StructuredResponse {
  content: string;
  sceneUpdate?: { description: string; title: string };
  stateUpdates?: Record<string, string>;
}

function extractJsonObject(text: string): string | null {
  // Try the whole text first
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Fall through to brace matching
  }

  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '{') {
      if (depth === 0) {
        start = i;
      }
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function parseStructuredResponse(raw: string): StructuredResponse | null {
  const trimmed = raw.trim();

  // Try to extract JSON from markdown fences first
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenceMatch ? fenceMatch[1] : trimmed;

  const extracted = extractJsonObject(jsonText);

  if (!extracted) {
    return null;
  }

  try {
    const parsed = JSON.parse(extracted);

    if (typeof parsed.content !== 'string') {
      return null;
    }

    return {
      content: parsed.content,
      sceneUpdate: parsed.scene_update && typeof parsed.scene_update === 'object' ? {
        description: String(parsed.scene_update.description ?? ''),
        title: String(parsed.scene_update.title ?? ''),
      } : undefined,
      stateUpdates: parsed.state_updates && typeof parsed.state_updates === 'object'
        ? Object.fromEntries(Object.entries(parsed.state_updates).map(([k, v]) => [k, String(v)]))
        : undefined,
    };
  } catch {
    return null;
  }
}

async function forwardAssistantStream(
  stream: Parameters<typeof streamSSE>[1] extends (stream: infer T) => Promise<void> ? T : never,
  dependencies: AppDependencies,
  chat: Chat,
  messageId: string,
  chunks: AsyncIterable<ProviderChunk>,
  adapter: ProviderAdapter,
  userName: string,
  preset: Preset,
): Promise<void> {
  let completed = false;
  let rawContent = '';
  const chatId = chat.id;
  const reasoningPrefix = preset.instructTemplate?.reasoningPrefix;
  const reasoningSuffix = preset.instructTemplate?.reasoningSuffix;
  const extractor = reasoningPrefix && reasoningSuffix
    ? createReasoningExtractor(reasoningPrefix, reasoningSuffix)
    : null;

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
        if (extractor) {
          const parts = extractor.extract(chunk.text);
          for (const part of parts) {
            if (part.type === 'reasoning') {
              await dependencies.messages.appendReasoning(messageId, part.text);
              await writeStreamEvent(stream, {
                chatId,
                messageId,
                text: part.text,
                type: 'reasoning.delta',
              });
            } else {
              await dependencies.messages.appendContent(messageId, part.text);
              rawContent += part.text;
              await writeStreamEvent(stream, {
                chatId,
                messageId,
                text: part.text,
                type: 'content.delta',
              });
            }
          }
        } else {
          await dependencies.messages.appendContent(messageId, chunk.text);
          rawContent += chunk.text;
          await writeStreamEvent(stream, {
            chatId,
            messageId,
            text: chunk.text,
            type: 'content.delta',
          });
        }
      }

      if (chunk.kind === 'done' && !completed) {
        completed = true;
      }
    }

    // Flush any remaining buffered text from the extractor.
    if (extractor) {
      const parts = extractor.flush();
      for (const part of parts) {
        if (part.type === 'reasoning') {
          await dependencies.messages.appendReasoning(messageId, part.text);
          await writeStreamEvent(stream, {
            chatId,
            messageId,
            text: part.text,
            type: 'reasoning.delta',
          });
        } else {
          await dependencies.messages.appendContent(messageId, part.text);
          rawContent += part.text;
          await writeStreamEvent(stream, {
            chatId,
            messageId,
            text: part.text,
            type: 'content.delta',
          });
        }
      }
    }

    if (completed) {
      await dependencies.messages.updateState(messageId, 'completed');

      // Structured mode parsing and update application
      if (preset.structuredMode && rawContent.trim()) {
        const structured = parseStructuredResponse(rawContent);

        if (structured) {
          await dependencies.messages.updateContent(messageId, structured.content);

          if (structured.stateUpdates && chat.characterId) {
            const existingStates = await dependencies.characterStates.listByCharacterId(chat.characterId);

            for (const [key, value] of Object.entries(structured.stateUpdates)) {
              const existing = existingStates.find((s) => s.key === key);

              if (existing) {
                await dependencies.characterStates.update(existing.id, { value });
              } else {
                await dependencies.characterStates.create({ characterId: chat.characterId, key, value });
              }
            }
          }

          if (structured.sceneUpdate) {
            const scenes = await dependencies.scenes.listByChatId(chat.id);
            const activeScene = scenes.find((s) => s.isActive);

            if (activeScene) {
              await dependencies.scenes.update(activeScene.id, {
                description: structured.sceneUpdate.description,
                title: structured.sceneUpdate.title,
              });
            } else {
              await dependencies.scenes.create({
                chatId: chat.id,
                description: structured.sceneUpdate.description,
                sortOrder: scenes.length,
                title: structured.sceneUpdate.title,
              });
            }
          }

          await writeStreamEvent(stream, {
            chatId,
            messageId,
            sceneUpdate: structured.sceneUpdate,
            stateUpdates: structured.stateUpdates,
            type: 'metadata.updates',
          });
        }
      }

      // Usurpation check on clean content
      const message = await dependencies.messages.getById(messageId);

      if (message?.content) {
        const truncateAt = findUsurpationPoint(message.content, userName);

        if (truncateAt !== -1) {
          const cleanContent = message.content.slice(0, truncateAt).trim();

          if (cleanContent !== message.content) {
            await dependencies.messages.updateContent(messageId, cleanContent);
          }
        }
      }

      await writeStreamEvent(stream, {
        chatId,
        messageId,
        type: 'response.completed',
      });

      maybeSummarizeChat(dependencies, chatId, adapter).catch(() => {});
    } else {
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

function getStaticContentType(filePath: string): string {
  return staticContentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
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

async function persistBackground(config: AppConfig, filename: string, buffer: Buffer): Promise<string> {
  const bgDir = resolve(config.mediaRoot, 'backgrounds');

  await mkdir(bgDir, { recursive: true });

  const extension = extname(filename) || '.png';
  const finalName = `${sanitizeFileStem(basename(filename, extension))}-${crypto.randomUUID()}${extension}`;
  const fullPath = join(bgDir, finalName);

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
    authorNote: z.string().optional(),
    authorNoteDepth: z.number().int().nonnegative().optional(),
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

const UpdateSceneRouteSchema = UpdateSceneInputSchema;
const UpdateCharacterStateRouteSchema = UpdateCharacterStateInputSchema;
const CreateSceneRouteSchema = CreateSceneInputSchema;
const CreateCharacterStateRouteSchema = CreateCharacterStateInputSchema;

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

function findUsurpationPoint(content: string, userName: string): number {
  const patterns: string[] = [];
  const trimmedName = userName.trim();

  if (trimmedName) {
    patterns.push(`\n\n${trimmedName}:`, `\n${trimmedName}:`, `\n\n${trimmedName} `, `\n${trimmedName} asked`, `\n${trimmedName} said`);
  }

  patterns.push('\n\nYou:', '\nYou:', '\n\nyou:', '\nyou:', '\n\nYou ', '\nYou ');

  let earliest = -1;

  for (const pattern of patterns) {
    const idx = content.indexOf(pattern);
    if (idx !== -1 && (earliest === -1 || idx < earliest)) {
      earliest = idx;
    }
  }

  return earliest;
}

function buildGenerationInput(
  promptPreview: PromptPreview,
  preset: Preset,
  providerConfig: ProviderConfig,
  personaName: string,
  overrides: {
    maxOutputTokens?: number;
    temperature?: number;
  },
) {
  const autoStop: string[] = [];
  const trimmedName = personaName.trim();

  if (trimmedName) {
    autoStop.push(`\n${trimmedName}:`, `${trimmedName}:`);
  }

  autoStop.push('\nYou:', 'You:', '\nyou:', 'you:');

  const baseInput = {
    contextLength: preset.contextLength,
    frequencyPenalty: preset.frequencyPenalty,
    maxOutputTokens: overrides.maxOutputTokens ?? preset.maxOutputTokens,
    minP: preset.minP,
    model: providerConfig.model,
    presencePenalty: preset.presencePenalty,
    repeatPenalty: preset.repeatPenalty,
    seed: preset.seed,
    stop: [...preset.stopStrings, ...autoStop],
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
  app.use('/scenes', requireAuth(config));
  app.use('/scenes/*', requireAuth(config));
  app.use('/character-states', requireAuth(config));
  app.use('/character-states/*', requireAuth(config));
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

  app.get('/characters/:characterId/states', async (c) => {
    const character = await dependencies.characters.getById(c.req.param('characterId'));
    if (!character) return c.json({ error: 'Character not found' }, 404);
    return c.json(await dependencies.characterStates.listByCharacterId(character.id));
  });

  app.post('/characters/:characterId/states', async (c) => {
    const character = await dependencies.characters.getById(c.req.param('characterId'));
    if (!character) return c.json({ error: 'Character not found' }, 404);
    const input = CreateCharacterStateRouteSchema.parse(await c.req.json());
    const state = await dependencies.characterStates.create({ ...input, characterId: character.id });
    return c.json(state, 201);
  });

  app.patch('/character-states/:stateId', async (c) => {
    const input = UpdateCharacterStateRouteSchema.parse(await c.req.json());
    const state = await dependencies.characterStates.update(c.req.param('stateId'), input);
    return c.json(state);
  });

  app.delete('/character-states/:stateId', async (c) => {
    await dependencies.characterStates.delete(c.req.param('stateId'));
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

  app.post('/tts', async (c) => {
    const body = await c.req.json();
    const settings = await dependencies.appSettings.get();
    const ttsServerUrl = settings.ttsServerUrl;

    if (!ttsServerUrl) {
      return c.json({ error: 'TTS server URL not configured' }, 400);
    }

    const response = await fetch(`${ttsServerUrl}/v1/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: body.text,
        reference_id: body.referenceId ?? undefined,
        format: 'mp3',
      }),
    });

    if (!response.ok) {
      return c.json({ error: 'TTS generation failed' }, 502);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
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

  app.get('/chats/:chatId/scenes', async (c) => {
    const chat = await dependencies.chats.getById(c.req.param('chatId'));
    if (!chat) return c.json({ error: 'Chat not found' }, 404);
    return c.json(await dependencies.scenes.listByChatId(chat.id));
  });

  app.post('/chats/:chatId/scenes', async (c) => {
    const chat = await dependencies.chats.getById(c.req.param('chatId'));
    if (!chat) return c.json({ error: 'Chat not found' }, 404);
    const input = CreateSceneRouteSchema.parse(await c.req.json());
    const scene = await dependencies.scenes.create({ ...input, chatId: chat.id });
    return c.json(scene, 201);
  });

  app.patch('/scenes/:sceneId', async (c) => {
    const input = UpdateSceneRouteSchema.parse(await c.req.json());
    const scene = await dependencies.scenes.update(c.req.param('sceneId'), input);
    return c.json(scene);
  });

  app.delete('/scenes/:sceneId', async (c) => {
    await dependencies.scenes.delete(c.req.param('sceneId'));
    return c.body(null, 204);
  });

  app.post('/scenes/:sceneId/activate', async (c) => {
    const scene = await dependencies.scenes.getById(c.req.param('sceneId'));
    if (!scene) return c.json({ error: 'Scene not found' }, 404);
    const activated = await dependencies.scenes.setActiveScene(scene.chatId, scene.id);
    return c.json(activated);
  });

  app.post('/scenes/:sceneId/background', async (c) => {
    const scene = await dependencies.scenes.getById(c.req.param('sceneId'));
    if (!scene) return c.json({ error: 'Scene not found' }, 404);
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return c.json({ error: 'Background file is required' }, 400);
    }
    const assetPath = await persistBackground(config, file.name || 'background.png', Buffer.from(await file.arrayBuffer()));
    const updated = await dependencies.scenes.update(scene.id, { backgroundAssetPath: assetPath });
    return c.json(updated);
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

  app.get('/chats/:chatId/tree', async (c) => {
    const chat = await dependencies.chats.getById(c.req.param('chatId'));
    if (!chat) return c.json({ error: 'Chat not found' }, 404);
    const allMessages = await dependencies.messages.listByChatId(chat.id);
    return c.json(allMessages);
  });

  app.get('/chats/:chatId/search', async (c) => {
    const chat = await dependencies.chats.getById(c.req.param('chatId'));
    if (!chat) return c.json({ error: 'Chat not found' }, 404);
    const query = c.req.query('q');
    if (!query || query.trim().length < 2) {
      return c.json({ error: 'Query must be at least 2 characters' }, 400);
    }
    return c.json(await dependencies.messages.searchByChatId(chat.id, query.trim()));
  });

  app.get('/chats/:chatId/export', async (c) => {
    const chat = await dependencies.chats.getById(c.req.param('chatId'));
    if (!chat) return c.json({ error: 'Chat not found' }, 404);
    const format = c.req.query('format') ?? 'markdown';
    const msgs = await dependencies.messages.listByChatId(chat.id);
    const character = chat.characterId ? await dependencies.characters.getById(chat.characterId) : null;
    const settings = await dependencies.appSettings.get();

    if (format === 'json') {
      return c.json({
        character: character ?? null,
        chat,
        exportedAt: new Date().toISOString(),
        messages: msgs,
      });
    }

    if (format === 'html') {
      const lines = [
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>', chat.title, '</title>',
        '<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;line-height:1.7;color:#222}',
        '.msg{margin:16px 0;padding:12px 16px;border-radius:8px}',
        '.user{background:#f3f4f6;text-align:right}',
        '.assistant{background:#eef2ff}',
        '.meta{font-size:12px;color:#666;margin-bottom:4px}',
        '</style></head><body>',
        '<h1>', chat.title, '</h1>',
      ];
      for (const msg of msgs) {
        const name = msg.role === 'assistant' ? (character?.name ?? 'Assistant') : (settings.personaName || 'You');
        lines.push(`<div class="msg ${msg.role}"><div class="meta">${name}</div><div>${msg.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div></div>`);
      }
      lines.push('</body></html>');
      return new Response(lines.join(''), { headers: { 'content-type': 'text/html; charset=utf-8', 'content-disposition': `attachment; filename="${chat.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'chat'}.html"` } });
    }

    // markdown default
    const lines = [`# ${chat.title}\n`];
    for (const msg of msgs) {
      const name = msg.role === 'assistant' ? (character?.name ?? 'Assistant') : (settings.personaName || 'You');
      lines.push(`**${name}**\n\n${msg.content}\n`);
    }
    return new Response(lines.join('\n'), { headers: { 'content-type': 'text/markdown; charset=utf-8', 'content-disposition': `attachment; filename="${chat.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'chat'}.md"` } });
  });

  app.post('/messages/:messageId/fork', async (c) => {
    const message = await dependencies.messages.getById(c.req.param('messageId'));
    if (!message) return c.json({ error: 'Message not found' }, 404);

    const allMessages = await dependencies.messages.listByChatId(message.chatId);
    const chat = await dependencies.chats.getById(message.chatId);
    if (!chat) return c.json({ error: 'Chat not found' }, 404);

    const ancestorIds = new Set<string>();
    let current: typeof message | undefined = message;
    let iterations = 0;
    const maxIterations = allMessages.length + 1;

    while (current) {
      ancestorIds.add(current.id);
      if (!current.parentId) break;
      current = allMessages.find((m) => m.id === current!.parentId);
      iterations++;
      if (iterations > maxIterations) {
        return c.json({ error: 'Message ancestry contains a cycle' }, 500);
      }
    }

    const forkedChat = await dependencies.chats.create({
      title: `Fork of ${chat.title ?? 'Chat'}`,
      authorNote: chat.authorNote,
      authorNoteDepth: chat.authorNoteDepth,
      characterId: chat.characterId,
      presetId: chat.presetId,
      providerConfigId: chat.providerConfigId,
    });

    const messageMap = new Map<string, string>();
    const messagesToCopy = allMessages.filter((m) => ancestorIds.has(m.id)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const msg of messagesToCopy) {
      const newMsg = await dependencies.messages.create({
        chatId: forkedChat.id,
        content: msg.content,
        role: msg.role,
        parentId: msg.parentId ? messageMap.get(msg.parentId) ?? null : null,
      });
      messageMap.set(msg.id, newMsg.id);
    }

    return c.json(forkedChat, 201);
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
      const characterStateList = character ? await dependencies.characterStates.listByCharacterId(character.id) : [];
      const sceneList = await dependencies.scenes.listByChatId(chat.id);
      const activeScene = sceneList.find((s) => s.isActive) ?? null;
      const settings = await dependencies.appSettings.get();
      const messages = await dependencies.messages.listByChatId(chat.id);
      const adapter = dependencies.createProviderAdapter(providerConfig);
      const preview = await buildPromptPreview({
        authorNote: chat.authorNote,
        authorNoteDepth: chat.authorNoteDepth,
        character,
        characterStates: characterStateList,
        chatId: chat.id,
        config,
        countTokens: adapter.countTokens.bind(adapter),
        messages,
        preset,
        provider: providerConfig,
        scene: activeScene,
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
      const characterStateList = character ? await dependencies.characterStates.listByCharacterId(character.id) : [];
      const sceneList = await dependencies.scenes.listByChatId(chat.id);
      const activeScene = sceneList.find((s) => s.isActive) ?? null;
      const settings = await dependencies.appSettings.get();
      const adapter = dependencies.createProviderAdapter(providerConfig);
      const promptPreview = await buildPromptPreview({
        authorNote: chat.authorNote,
        authorNoteDepth: chat.authorNoteDepth,
        character,
        characterStates: characterStateList,
        chatId: chat.id,
        config,
        countTokens: adapter.countTokens.bind(adapter),
        messages: history,
        preset,
        provider: providerConfig,
        scene: activeScene,
        settings,
      });
      const assistantMessage = await dependencies.messages.create({
        chatId: chat.id,
        content: '',
        reasoningContent: '',
        role: 'assistant',
        state: 'streaming',
      });

      return streamSSE(c, async (stream) => forwardAssistantStream(
        stream,
        dependencies,
        chat,
        assistantMessage.id,
        adapter.streamGenerate(buildGenerationInput(promptPreview, preset, providerConfig, settings.personaName, {
          maxOutputTokens: request.maxOutputTokens,
          temperature: request.temperature,
        })),
        adapter,
        settings.personaName,
        preset,
      ));
    } catch (error) {
      if (error instanceof Error && error.message === 'Chat not found') {
        return c.json({ error: error.message }, 404);
      }

      throw error;
    }
  });

  app.post('/chats/:chatId/regenerate', async (c) => {
    try {
      const chat = await getRequiredChat(dependencies, c.req.param('chatId'));
      const request = RetryChatRouteSchema.parse(await c.req.json());
      const providerConfig = await resolveProviderConfig(dependencies, chat, request.providerConfigId);
      const preset = await resolvePreset(dependencies, chat);

      if (!providerConfig || !preset) {
        return c.json({ error: !providerConfig ? 'Provider not found' : 'Preset not found' }, 404);
      }

      const history = await dependencies.messages.listByChatId(chat.id);
      const character = chat.characterId ? await dependencies.characters.getById(chat.characterId) : null;
      const characterStateList = character ? await dependencies.characterStates.listByCharacterId(character.id) : [];
      const sceneList = await dependencies.scenes.listByChatId(chat.id);
      const activeScene = sceneList.find((s) => s.isActive) ?? null;
      const settings = await dependencies.appSettings.get();
      const adapter = dependencies.createProviderAdapter(providerConfig);
      const promptPreview = await buildPromptPreview({
        authorNote: chat.authorNote,
        authorNoteDepth: chat.authorNoteDepth,
        character,
        characterStates: characterStateList,
        chatId: chat.id,
        config,
        countTokens: adapter.countTokens.bind(adapter),
        messages: history,
        preset,
        provider: providerConfig,
        scene: activeScene,
        settings,
      });
      const assistantMessage = await dependencies.messages.create({
        chatId: chat.id,
        content: '',
        reasoningContent: '',
        role: 'assistant',
        state: 'streaming',
      });

      return streamSSE(c, async (stream) => forwardAssistantStream(
        stream,
        dependencies,
        chat,
        assistantMessage.id,
        adapter.streamGenerate(buildGenerationInput(promptPreview, preset, providerConfig, settings.personaName, {
          maxOutputTokens: request.maxOutputTokens,
          temperature: request.temperature,
        })),
        adapter,
        settings.personaName,
        preset,
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
      const characterStateList = character ? await dependencies.characterStates.listByCharacterId(character.id) : [];
      const sceneList = await dependencies.scenes.listByChatId(chat.id);
      const activeScene = sceneList.find((s) => s.isActive) ?? null;
      const settings = await dependencies.appSettings.get();
      const adapter = dependencies.createProviderAdapter(providerConfig);
      const promptPreview = await buildPromptPreview({
        authorNote: chat.authorNote,
        authorNoteDepth: chat.authorNoteDepth,
        character,
        characterStates: characterStateList,
        chatId: chat.id,
        config,
        countTokens: adapter.countTokens.bind(adapter),
        messages: history,
        preset,
        provider: providerConfig,
        scene: activeScene,
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

      return streamSSE(c, async (stream) => forwardAssistantStream(
        stream,
        dependencies,
        chat,
        assistantMessage.id,
        adapter.streamGenerate(buildGenerationInput(promptPreview, preset, providerConfig, settings.personaName, {
          maxOutputTokens: request.maxOutputTokens,
          temperature: request.temperature,
        })),
        adapter,
        settings.personaName,
        preset,
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
      const characterStateList = character ? await dependencies.characterStates.listByCharacterId(character.id) : [];
      const sceneList = await dependencies.scenes.listByChatId(chat.id);
      const activeScene = sceneList.find((s) => s.isActive) ?? null;
      const settings = await dependencies.appSettings.get();
      const adapter = dependencies.createProviderAdapter(providerConfig);
      const promptPreview = await buildPromptPreview({
        authorNote: chat.authorNote,
        authorNoteDepth: chat.authorNoteDepth,
        character,
        characterStates: characterStateList,
        chatId: chat.id,
        config,
        countTokens: adapter.countTokens.bind(adapter),
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
            parentId: null,
            reasoningContent: '',
            role: 'user',
            sceneId: null,
            state: 'completed',
            summaryOf: [],
            updatedAt: new Date().toISOString(),
          },
        ],
        preset,
        provider: providerConfig,
        scene: activeScene,
        settings,
      });

      await dependencies.messages.updateState(lastMessage.id, 'streaming');

      return streamSSE(c, async (stream) => forwardAssistantStream(
        stream,
        dependencies,
        chat,
        lastMessage.id,
        adapter.streamGenerate(buildGenerationInput(promptPreview, preset, providerConfig, settings.personaName, {
          maxOutputTokens: request.maxOutputTokens,
          temperature: request.temperature,
        })),
        adapter,
        settings.personaName,
        preset,
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

  app.get('*', async (c) => {
    if (!existsSync(webDistRoot)) {
      return c.json({ error: 'Not found' }, 404);
    }

    const requestPath = c.req.path === '/' ? '/index.html' : c.req.path;
    const requestedFilePath = resolve(webDistRoot, `.${requestPath}`);

    if (requestedFilePath.startsWith(webDistRoot) && existsSync(requestedFilePath)) {
      return new Response(await readFile(requestedFilePath), {
        headers: {
          'content-type': getStaticContentType(requestedFilePath),
        },
      });
    }

    if (extname(c.req.path)) {
      return c.json({ error: 'Not found' }, 404);
    }

    const indexFilePath = resolve(webDistRoot, 'index.html');

    if (!existsSync(indexFilePath)) {
      return c.json({ error: 'Not found' }, 404);
    }

    return new Response(await readFile(indexFilePath), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    });
  });

  return app;
}
