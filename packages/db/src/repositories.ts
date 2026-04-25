import { desc, eq } from 'drizzle-orm';

import type {
  AppSettings,
  Character,
  CharacterState,
  Chat,
  CreateCharacterInput,
  CreateChatInput,
  CreatePresetInput,
  CreateProviderConfigInput,
  Message,
  MessageRole,
  MessageState,
  Preset,
  ProviderConfig,
  Scene,
  UpdateCharacterInput,
  UpdateChatInput,
  UpdatePresetInput,
  UpdateProviderConfigInput,
  UpdateAppSettingsInput,
  CreateSceneInput,
  UpdateSceneInput,
  CreateCharacterStateInput,
  UpdateCharacterStateInput,
} from '@forward/shared';
import { AppSettingsSchema, CharacterSchema, CharacterStateSchema, ChatSchema, MessageSchema, PresetSchema, ProviderConfigSchema, SceneSchema } from '@forward/shared';

import type { SqliteDatabaseClient } from './client';
import { appSettings, characterStates, characters, chats, messages, presets, providerConfigs, scenes } from './schema';

export interface ProviderConfigRepository {
  create(input: CreateProviderConfigInput): Promise<ProviderConfig>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<ProviderConfig | null>;
  list(): Promise<ProviderConfig[]>;
  update(id: string, input: UpdateProviderConfigInput): Promise<ProviderConfig>;
  upsert(input: ProviderConfig): Promise<ProviderConfig>;
}

export interface ChatRepository {
  create(input: CreateChatInput): Promise<Chat>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Chat | null>;
  list(): Promise<Chat[]>;
  update(id: string, input: UpdateChatInput): Promise<Chat>;
}

export interface CharacterRepository {
  create(input: CreateCharacterInput): Promise<Character>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Character | null>;
  list(): Promise<Character[]>;
  update(id: string, input: UpdateCharacterInput): Promise<Character>;
}

export interface PresetRepository {
  create(input: CreatePresetInput): Promise<Preset>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Preset | null>;
  list(): Promise<Preset[]>;
  upsert(input: Preset): Promise<Preset>;
  update(id: string, input: UpdatePresetInput): Promise<Preset>;
}

export interface CreateMessageInput {
  attemptGroupId?: string | null;
  attemptIndex?: number;
  chatId: string;
  content: string;
  isActiveAttempt?: boolean;
  parentId?: string | null;
  reasoningContent?: string;
  role: MessageRole;
  sceneId?: string | null;
  state?: MessageState;
  summaryOf?: string[];
}

export interface MessageRepository {
  appendContent(id: string, delta: string): Promise<Message>;
  appendReasoning(id: string, delta: string): Promise<Message>;
  create(input: CreateMessageInput): Promise<Message>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Message | null>;
  listByChatId(chatId: string): Promise<Message[]>;
  searchByChatId(chatId: string, query: string): Promise<Message[]>;
  setActiveAttempt(messageId: string): Promise<Message>;
  updateContent(id: string, content: string): Promise<Message>;
  updateState(id: string, state: MessageState): Promise<Message>;
}

export interface SceneRepository {
  create(input: CreateSceneInput): Promise<Scene>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Scene | null>;
  listByChatId(chatId: string): Promise<Scene[]>;
  update(id: string, input: UpdateSceneInput): Promise<Scene>;
  setActiveScene(chatId: string, sceneId: string): Promise<Scene>;
}

export interface CharacterStateRepository {
  create(input: CreateCharacterStateInput): Promise<CharacterState>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<CharacterState | null>;
  listByCharacterId(characterId: string): Promise<CharacterState[]>;
  update(id: string, input: UpdateCharacterStateInput): Promise<CharacterState>;
}

export interface AppRepositories {
  appSettings: AppSettingsRepository;
  characterStates: CharacterStateRepository;
  characters: CharacterRepository;
  chats: ChatRepository;
  messages: MessageRepository;
  presets: PresetRepository;
  providerConfigs: ProviderConfigRepository;
  scenes: SceneRepository;
}

export interface AppSettingsRepository {
  get(): Promise<AppSettings>;
  update(input: UpdateAppSettingsInput): Promise<AppSettings>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapProviderConfig(row: typeof providerConfigs.$inferSelect): ProviderConfig {
  return ProviderConfigSchema.parse({
    apiKeyEnvVar: row.apiKeyEnvVar ?? null,
    baseUrl: row.baseUrl,
    id: row.id,
    model: row.model,
    name: row.name,
    providerType: row.providerType,
    reasoningEnabled: row.reasoningEnabled,
  });
}

function mapCharacter(row: typeof characters.$inferSelect): Character {
  return CharacterSchema.parse({
    avatarAssetPath: row.avatarAssetPath ?? null,
    description: row.description,
    exampleDialogue: row.exampleDialogue,
    firstMessage: row.firstMessage,
    id: row.id,
    name: row.name,
    personality: row.personality,
    scenario: row.scenario,
  });
}

function mapPreset(row: typeof presets.$inferSelect): Preset {
  return PresetSchema.parse({
    contextLength: row.contextLength,
    frequencyPenalty: row.frequencyPenalty,
    id: row.id,
    instructTemplate: row.instructTemplateJson ? JSON.parse(row.instructTemplateJson) : null,
    maxOutputTokens: row.maxOutputTokens,
    minP: row.minP,
    name: row.name,
    presencePenalty: row.presencePenalty,
    repeatPenalty: row.repeatPenalty,
    seed: row.seed ?? null,
    stopStrings: JSON.parse(row.stopStringsJson) as string[],
    structuredMode: row.structuredMode,
    systemPrompt: row.systemPrompt,
    thinkingBudgetTokens: row.thinkingBudgetTokens ?? null,
    temperature: row.temperature,
    topK: row.topK,
    topP: row.topP,
  });
}

function mapChat(row: typeof chats.$inferSelect): Chat {
  return ChatSchema.parse({
    authorNote: row.authorNote ?? '',
    authorNoteDepth: row.authorNoteDepth ?? 0,
    characterId: row.characterId ?? null,
    createdAt: row.createdAt,
    id: row.id,
    presetId: row.presetId ?? null,
    providerConfigId: row.providerConfigId ?? null,
    title: row.title,
    updatedAt: row.updatedAt,
  });
}

function mapMessage(row: typeof messages.$inferSelect): Message {
  return MessageSchema.parse({
    attemptGroupId: row.attemptGroupId ?? null,
    attemptIndex: row.attemptIndex,
    chatId: row.chatId,
    content: row.content,
    createdAt: row.createdAt,
    id: row.id,
    isActiveAttempt: row.isActiveAttempt,
    parentId: row.parentId ?? null,
    reasoningContent: row.reasoningContent,
    role: row.role,
    sceneId: row.sceneId ?? null,
    state: row.state,
    summaryOf: row.summaryOf ? JSON.parse(row.summaryOf) as string[] : [],
    updatedAt: row.updatedAt,
  });
}

function mapAppSettings(row: typeof appSettings.$inferSelect): AppSettings {
  return AppSettingsSchema.parse({
    createdAt: row.createdAt,
    defaultPresetId: row.defaultPresetId ?? null,
    defaultProviderConfigId: row.defaultProviderConfigId ?? null,
    displayMode: row.displayMode as AppSettings['displayMode'],
    id: row.id,
    personaAvatarAssetPath: row.personaAvatarAssetPath ?? null,
    personaDescription: row.personaDescription,
    personaName: row.personaName,
    showReasoningByDefault: row.showReasoningByDefault,
    updatedAt: row.updatedAt,
  });
}

function mapScene(row: typeof scenes.$inferSelect): Scene {
  return SceneSchema.parse({
    backgroundAssetPath: row.backgroundAssetPath ?? null,
    chatId: row.chatId,
    createdAt: row.createdAt,
    description: row.description,
    id: row.id,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    title: row.title,
    updatedAt: row.updatedAt,
  });
}

function mapCharacterState(row: typeof characterStates.$inferSelect): CharacterState {
  return CharacterStateSchema.parse({
    characterId: row.characterId,
    createdAt: row.createdAt,
    id: row.id,
    key: row.key,
    updatedAt: row.updatedAt,
    value: row.value,
  });
}

export function createAppSettingsRepository(client: SqliteDatabaseClient): AppSettingsRepository {
  const SETTINGS_ID = 'app_settings';

  function ensureSettingsRow(): typeof appSettings.$inferSelect {
    const existing = client.db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID)).get();

    if (existing) {
      return existing;
    }

    const timestamp = nowIso();

    client.db.insert(appSettings).values({
      createdAt: timestamp,
      defaultPresetId: null,
      defaultProviderConfigId: null,
      displayMode: 'chat',
      id: SETTINGS_ID,
      personaAvatarAssetPath: null,
      personaDescription: '',
      personaName: 'User',
      showReasoningByDefault: false,
      updatedAt: timestamp,
    }).run();

    return client.db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID)).get()!;
  }

  return {
    async get() {
      return mapAppSettings(ensureSettingsRow());
    },
    async update(input) {
      const existing = ensureSettingsRow();
      const timestamp = nowIso();

      client.db.update(appSettings).set({
        defaultPresetId: input.defaultPresetId === undefined ? existing.defaultPresetId : input.defaultPresetId,
        defaultProviderConfigId: input.defaultProviderConfigId === undefined ? existing.defaultProviderConfigId : input.defaultProviderConfigId,
        displayMode: input.displayMode === undefined ? existing.displayMode : input.displayMode,
        personaAvatarAssetPath: input.personaAvatarAssetPath === undefined ? existing.personaAvatarAssetPath : input.personaAvatarAssetPath,
        personaDescription: input.personaDescription ?? existing.personaDescription,
        personaName: input.personaName ?? existing.personaName,
        showReasoningByDefault: input.showReasoningByDefault ?? existing.showReasoningByDefault,
        updatedAt: timestamp,
      }).where(eq(appSettings.id, SETTINGS_ID)).run();

      return mapAppSettings(client.db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID)).get()!);
    },
  };
}

export function createProviderConfigRepository(client: SqliteDatabaseClient): ProviderConfigRepository {
  return {
    async create(input) {
      const id = crypto.randomUUID();
      const timestamp = nowIso();

      client.db
        .insert(providerConfigs)
        .values({
          apiKeyEnvVar: input.apiKeyEnvVar ?? null,
          baseUrl: input.baseUrl,
          createdAt: timestamp,
          id,
          model: input.model,
          name: input.name,
          providerType: input.providerType,
          reasoningEnabled: input.reasoningEnabled,
          updatedAt: timestamp,
        })
        .run();

      const row = client.db.select().from(providerConfigs).where(eq(providerConfigs.id, id)).get();

      if (!row) {
        throw new Error(`provider config ${id} was not persisted`);
      }

      return mapProviderConfig(row);
    },
    async delete(id) {
      client.db.delete(providerConfigs).where(eq(providerConfigs.id, id)).run();
    },
    async getById(id) {
      const row = client.db.select().from(providerConfigs).where(eq(providerConfigs.id, id)).get();

      return row ? mapProviderConfig(row) : null;
    },
    async list() {
      return client.db.select().from(providerConfigs).orderBy(providerConfigs.name).all().map(mapProviderConfig);
    },
    async update(id, input) {
      const existing = client.db.select().from(providerConfigs).where(eq(providerConfigs.id, id)).get();

      if (!existing) {
        throw new Error(`provider config ${id} was not found`);
      }

      const timestamp = nowIso();

      client.db
        .update(providerConfigs)
        .set({
          apiKeyEnvVar: input.apiKeyEnvVar === undefined ? existing.apiKeyEnvVar : (input.apiKeyEnvVar ?? null),
          baseUrl: input.baseUrl ?? existing.baseUrl,
          model: input.model ?? existing.model,
          name: input.name ?? existing.name,
          providerType: input.providerType ?? existing.providerType,
          reasoningEnabled: input.reasoningEnabled ?? existing.reasoningEnabled,
          updatedAt: timestamp,
        })
        .where(eq(providerConfigs.id, id))
        .run();

      return mapProviderConfig(client.db.select().from(providerConfigs).where(eq(providerConfigs.id, id)).get()!);
    },
    async upsert(input) {
      const existing = client.db.select().from(providerConfigs).where(eq(providerConfigs.id, input.id)).get();
      const timestamp = nowIso();

      if (existing) {
        client.db
          .update(providerConfigs)
          .set({
            apiKeyEnvVar: input.apiKeyEnvVar,
            baseUrl: input.baseUrl,
            model: input.model,
            name: input.name,
            providerType: input.providerType,
            reasoningEnabled: input.reasoningEnabled,
            updatedAt: timestamp,
          })
          .where(eq(providerConfigs.id, input.id))
          .run();
      } else {
        client.db
          .insert(providerConfigs)
          .values({
            apiKeyEnvVar: input.apiKeyEnvVar,
            baseUrl: input.baseUrl,
            createdAt: timestamp,
            id: input.id,
            model: input.model,
            name: input.name,
            providerType: input.providerType,
            reasoningEnabled: input.reasoningEnabled,
            updatedAt: timestamp,
          })
          .run();
      }

      const row = client.db.select().from(providerConfigs).where(eq(providerConfigs.id, input.id)).get();

      if (!row) {
        throw new Error(`provider config ${input.id} was not persisted`);
      }

      return mapProviderConfig(row);
    },
  };
}

export function createChatRepository(client: SqliteDatabaseClient): ChatRepository {
  return {
    async create(input) {
      const id = crypto.randomUUID();
      const timestamp = nowIso();

      client.db
        .insert(chats)
        .values({
          authorNote: input.authorNote ?? '',
          authorNoteDepth: input.authorNoteDepth ?? 0,
          characterId: input.characterId ?? null,
          createdAt: timestamp,
          id,
          presetId: input.presetId ?? null,
          providerConfigId: input.providerConfigId ?? null,
          title: input.title,
          updatedAt: timestamp,
        })
        .run();

      const row = client.db.select().from(chats).where(eq(chats.id, id)).get();

      if (!row) {
        throw new Error(`chat ${id} was not persisted`);
      }

      return mapChat(row);
    },
    async delete(id) {
      client.db.delete(messages).where(eq(messages.chatId, id)).run();
      client.db.delete(chats).where(eq(chats.id, id)).run();
    },
    async getById(id) {
      const row = client.db.select().from(chats).where(eq(chats.id, id)).get();

      return row ? mapChat(row) : null;
    },
    async list() {
      return client.db.select().from(chats).orderBy(desc(chats.updatedAt)).all().map(mapChat);
    },
    async update(id, input) {
      const existing = client.db.select().from(chats).where(eq(chats.id, id)).get();

      if (!existing) {
        throw new Error(`chat ${id} was not found`);
      }

      const timestamp = nowIso();

      client.db
        .update(chats)
        .set({
          authorNote: input.authorNote === undefined ? existing.authorNote : input.authorNote,
          authorNoteDepth: input.authorNoteDepth === undefined ? existing.authorNoteDepth : input.authorNoteDepth,
          characterId: input.characterId === undefined ? existing.characterId : input.characterId,
          presetId: input.presetId === undefined ? existing.presetId : input.presetId,
          providerConfigId: input.providerConfigId === undefined ? existing.providerConfigId : input.providerConfigId,
          title: input.title ?? existing.title,
          updatedAt: timestamp,
        })
        .where(eq(chats.id, id))
        .run();

      return mapChat(client.db.select().from(chats).where(eq(chats.id, id)).get()!);
    },
  };
}

export function createPresetRepository(client: SqliteDatabaseClient): PresetRepository {
  return {
    async create(input) {
      const id = crypto.randomUUID();
      const timestamp = nowIso();

      client.db
        .insert(presets)
        .values({
          contextLength: input.contextLength,
          createdAt: timestamp,
          frequencyPenalty: input.frequencyPenalty,
          id,
          instructTemplateJson: input.instructTemplate ? JSON.stringify(input.instructTemplate) : '',
          maxOutputTokens: input.maxOutputTokens,
          minP: input.minP,
          name: input.name,
          presencePenalty: input.presencePenalty,
          repeatPenalty: input.repeatPenalty,
          seed: input.seed ?? null,
          stopStringsJson: JSON.stringify(input.stopStrings),
          structuredMode: input.structuredMode,
          systemPrompt: input.systemPrompt,
          thinkingBudgetTokens: input.thinkingBudgetTokens ?? null,
          temperature: input.temperature,
          topK: input.topK,
          topP: input.topP,
          updatedAt: timestamp,
        })
        .run();

      return mapPreset(client.db.select().from(presets).where(eq(presets.id, id)).get()!);
    },
    async delete(id) {
      client.db.delete(presets).where(eq(presets.id, id)).run();
    },
    async getById(id) {
      const row = client.db.select().from(presets).where(eq(presets.id, id)).get();

      return row ? mapPreset(row) : null;
    },
    async list() {
      return client.db.select().from(presets).orderBy(presets.name).all().map(mapPreset);
    },
    async upsert(input) {
      const existing = client.db.select().from(presets).where(eq(presets.id, input.id)).get();
      const timestamp = nowIso();

      if (existing) {
        client.db
          .update(presets)
          .set({
            contextLength: input.contextLength,
            frequencyPenalty: input.frequencyPenalty,
            instructTemplateJson: input.instructTemplate ? JSON.stringify(input.instructTemplate) : '',
            maxOutputTokens: input.maxOutputTokens,
            minP: input.minP,
            name: input.name,
            presencePenalty: input.presencePenalty,
            repeatPenalty: input.repeatPenalty,
            seed: input.seed ?? null,
            stopStringsJson: JSON.stringify(input.stopStrings),
            structuredMode: input.structuredMode,
            systemPrompt: input.systemPrompt,
            thinkingBudgetTokens: input.thinkingBudgetTokens ?? null,
            temperature: input.temperature,
            topK: input.topK,
            topP: input.topP,
            updatedAt: timestamp,
          })
          .where(eq(presets.id, input.id))
          .run();
      } else {
        client.db
          .insert(presets)
          .values({
            contextLength: input.contextLength,
            createdAt: timestamp,
            frequencyPenalty: input.frequencyPenalty,
            id: input.id,
            instructTemplateJson: input.instructTemplate ? JSON.stringify(input.instructTemplate) : '',
            maxOutputTokens: input.maxOutputTokens,
            minP: input.minP,
            name: input.name,
            presencePenalty: input.presencePenalty,
            repeatPenalty: input.repeatPenalty,
            seed: input.seed ?? null,
            stopStringsJson: JSON.stringify(input.stopStrings),
            structuredMode: input.structuredMode,
            systemPrompt: input.systemPrompt,
            thinkingBudgetTokens: input.thinkingBudgetTokens ?? null,
            temperature: input.temperature,
            topK: input.topK,
            topP: input.topP,
            updatedAt: timestamp,
          })
          .run();
      }

      return mapPreset(client.db.select().from(presets).where(eq(presets.id, input.id)).get()!);
    },
    async update(id, input) {
      const existing = client.db.select().from(presets).where(eq(presets.id, id)).get();

      if (!existing) {
        throw new Error(`preset ${id} was not found`);
      }

      const timestamp = nowIso();

      client.db
        .update(presets)
        .set({
          contextLength: input.contextLength ?? existing.contextLength,
          frequencyPenalty: input.frequencyPenalty ?? existing.frequencyPenalty,
          instructTemplateJson: input.instructTemplate === undefined
            ? existing.instructTemplateJson
            : (input.instructTemplate ? JSON.stringify(input.instructTemplate) : ''),
          maxOutputTokens: input.maxOutputTokens ?? existing.maxOutputTokens,
          minP: input.minP ?? existing.minP,
          name: input.name ?? existing.name,
          presencePenalty: input.presencePenalty ?? existing.presencePenalty,
          repeatPenalty: input.repeatPenalty ?? existing.repeatPenalty,
          seed: input.seed === undefined ? existing.seed : (input.seed ?? null),
          stopStringsJson: JSON.stringify(input.stopStrings ?? JSON.parse(existing.stopStringsJson)),
          structuredMode: input.structuredMode === undefined ? existing.structuredMode : input.structuredMode,
          systemPrompt: input.systemPrompt ?? existing.systemPrompt,
          thinkingBudgetTokens: input.thinkingBudgetTokens === undefined ? existing.thinkingBudgetTokens : (input.thinkingBudgetTokens ?? null),
          temperature: input.temperature ?? existing.temperature,
          topK: input.topK ?? existing.topK,
          topP: input.topP ?? existing.topP,
          updatedAt: timestamp,
        })
        .where(eq(presets.id, id))
        .run();

      return mapPreset(client.db.select().from(presets).where(eq(presets.id, id)).get()!);
    },
  };
}

export function createCharacterRepository(client: SqliteDatabaseClient): CharacterRepository {
  return {
    async create(input) {
      const id = crypto.randomUUID();
      const timestamp = nowIso();

      client.db
        .insert(characters)
        .values({
          avatarAssetPath: input.avatarAssetPath ?? null,
          createdAt: timestamp,
          description: input.description,
          exampleDialogue: input.exampleDialogue,
          firstMessage: input.firstMessage,
          id,
          name: input.name,
          personality: input.personality,
          scenario: input.scenario,
          updatedAt: timestamp,
        })
        .run();

      return mapCharacter(client.db.select().from(characters).where(eq(characters.id, id)).get()!);
    },
    async delete(id) {
      client.db.delete(characters).where(eq(characters.id, id)).run();
    },
    async getById(id) {
      const row = client.db.select().from(characters).where(eq(characters.id, id)).get();

      return row ? mapCharacter(row) : null;
    },
    async list() {
      return client.db.select().from(characters).orderBy(characters.name).all().map(mapCharacter);
    },
    async update(id, input) {
      const existing = client.db.select().from(characters).where(eq(characters.id, id)).get();

      if (!existing) {
        throw new Error(`character ${id} was not found`);
      }

      const timestamp = nowIso();

      client.db
        .update(characters)
        .set({
          avatarAssetPath: input.avatarAssetPath === undefined ? existing.avatarAssetPath : input.avatarAssetPath,
          description: input.description ?? existing.description,
          exampleDialogue: input.exampleDialogue ?? existing.exampleDialogue,
          firstMessage: input.firstMessage ?? existing.firstMessage,
          name: input.name ?? existing.name,
          personality: input.personality ?? existing.personality,
          scenario: input.scenario ?? existing.scenario,
          updatedAt: timestamp,
        })
        .where(eq(characters.id, id))
        .run();

      return mapCharacter(client.db.select().from(characters).where(eq(characters.id, id)).get()!);
    },
  };
}

export function createMessageRepository(client: SqliteDatabaseClient): MessageRepository {
  function getRequiredMessage(id: string): typeof messages.$inferSelect {
    const row = client.db.select().from(messages).where(eq(messages.id, id)).get();

    if (!row) {
      throw new Error(`message ${id} was not found`);
    }

    return row;
  }

  function touchChat(chatId: string, timestamp: string): void {
    client.db.update(chats).set({ updatedAt: timestamp }).where(eq(chats.id, chatId)).run();
  }

  return {
    async appendContent(id, delta) {
      const existing = getRequiredMessage(id);
      const timestamp = nowIso();

      client.db
        .update(messages)
        .set({
          content: `${existing.content}${delta}`,
          updatedAt: timestamp,
        })
        .where(eq(messages.id, id))
        .run();

      touchChat(existing.chatId, timestamp);

      return mapMessage(getRequiredMessage(id));
    },
    async appendReasoning(id, delta) {
      const existing = getRequiredMessage(id);
      const timestamp = nowIso();

      client.db
        .update(messages)
        .set({
          reasoningContent: `${existing.reasoningContent}${delta}`,
          updatedAt: timestamp,
        })
        .where(eq(messages.id, id))
        .run();

      touchChat(existing.chatId, timestamp);

      return mapMessage(getRequiredMessage(id));
    },
    async create(input) {
      const id = crypto.randomUUID();
      const timestamp = nowIso();
      const attemptGroupId = input.role === 'assistant'
        ? (input.attemptGroupId ?? id)
        : null;
      const attemptIndex = input.role === 'assistant'
        ? (input.attemptIndex ?? 0)
        : 0;
      const isActiveAttempt = input.role === 'assistant'
        ? (input.isActiveAttempt ?? true)
        : true;

      client.db
        .insert(messages)
        .values({
          attemptGroupId,
          attemptIndex,
          chatId: input.chatId,
          content: input.content,
          createdAt: timestamp,
          id,
          isActiveAttempt,
          parentId: input.parentId ?? null,
          reasoningContent: input.reasoningContent ?? '',
          role: input.role,
          sceneId: input.sceneId ?? null,
          state: input.state ?? 'completed',
          summaryOf: input.summaryOf ? JSON.stringify(input.summaryOf) : '',
          tokenEstimate: null,
          updatedAt: timestamp,
        })
        .run();

      const row = client.db.select().from(messages).where(eq(messages.id, id)).get();

      if (!row) {
        throw new Error(`message ${id} was not persisted`);
      }

      touchChat(input.chatId, timestamp);

      return mapMessage(row);
    },
    async getById(id) {
      const row = client.db.select().from(messages).where(eq(messages.id, id)).get();

      return row ? mapMessage(row) : null;
    },
    async listByChatId(chatId) {
      return client.db.select().from(messages).where(eq(messages.chatId, chatId)).orderBy(messages.createdAt).all().map(mapMessage);
    },
    async searchByChatId(chatId, query) {
      const pattern = `%${query.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      const stmt = client.sqlite.prepare(`SELECT * FROM messages WHERE chat_id = ? AND content LIKE ? ESCAPE '\\' ORDER BY created_at`);
      const rows = stmt.all(chatId, pattern) as unknown as Array<typeof messages.$inferSelect>;
      return rows.map(mapMessage);
    },
    async setActiveAttempt(messageId) {
      const existing = getRequiredMessage(messageId);

      if (existing.role !== 'assistant' || !existing.attemptGroupId) {
        throw new Error(`message ${messageId} is not part of an assistant attempt group`);
      }

      const timestamp = nowIso();

      client.db
        .update(messages)
        .set({
          isActiveAttempt: false,
          updatedAt: timestamp,
        })
        .where(eq(messages.attemptGroupId, existing.attemptGroupId))
        .run();

      client.db
        .update(messages)
        .set({
          isActiveAttempt: true,
          updatedAt: timestamp,
        })
        .where(eq(messages.id, messageId))
        .run();

      touchChat(existing.chatId, timestamp);

      return mapMessage(getRequiredMessage(messageId));
    },
    async delete(id) {
      const existing = getRequiredMessage(id);
      const timestamp = nowIso();

      client.db.delete(messages).where(eq(messages.id, id)).run();
      touchChat(existing.chatId, timestamp);
    },
    async updateContent(id, content) {
      const existing = getRequiredMessage(id);
      const timestamp = nowIso();

      client.db
        .update(messages)
        .set({
          content,
          updatedAt: timestamp,
        })
        .where(eq(messages.id, id))
        .run();

      touchChat(existing.chatId, timestamp);

      return mapMessage(getRequiredMessage(id));
    },
    async updateState(id, state) {
      const existing = getRequiredMessage(id);
      const timestamp = nowIso();

      client.db
        .update(messages)
        .set({
          state,
          updatedAt: timestamp,
        })
        .where(eq(messages.id, id))
        .run();

      touchChat(existing.chatId, timestamp);

      return mapMessage(getRequiredMessage(id));
    },
  };
}

export function createSceneRepository(client: SqliteDatabaseClient): SceneRepository {
  return {
    async create(input) {
      const id = crypto.randomUUID();
      const timestamp = nowIso();

      client.db
        .insert(scenes)
        .values({
          backgroundAssetPath: null,
          chatId: input.chatId,
          createdAt: timestamp,
          description: input.description ?? '',
          id,
          isActive: false,
          sortOrder: input.sortOrder ?? 0,
          title: input.title,
          updatedAt: timestamp,
        })
        .run();

      return mapScene(client.db.select().from(scenes).where(eq(scenes.id, id)).get()!);
    },
    async delete(id) {
      client.db.delete(scenes).where(eq(scenes.id, id)).run();
    },
    async getById(id) {
      const row = client.db.select().from(scenes).where(eq(scenes.id, id)).get();
      return row ? mapScene(row) : null;
    },
    async listByChatId(chatId) {
      return client.db.select().from(scenes).where(eq(scenes.chatId, chatId)).orderBy(scenes.sortOrder).all().map(mapScene);
    },
    async update(id, input) {
      const existing = client.db.select().from(scenes).where(eq(scenes.id, id)).get();
      if (!existing) throw new Error(`scene ${id} was not found`);
      const timestamp = nowIso();

      client.db
        .update(scenes)
        .set({
          backgroundAssetPath: input.backgroundAssetPath === undefined ? existing.backgroundAssetPath : input.backgroundAssetPath,
          description: input.description === undefined ? existing.description : input.description,
          isActive: input.isActive === undefined ? existing.isActive : input.isActive,
          sortOrder: input.sortOrder === undefined ? existing.sortOrder : input.sortOrder,
          title: input.title ?? existing.title,
          updatedAt: timestamp,
        })
        .where(eq(scenes.id, id))
        .run();

      return mapScene(client.db.select().from(scenes).where(eq(scenes.id, id)).get()!);
    },
    async setActiveScene(chatId, sceneId) {
      const timestamp = nowIso();
      client.sqlite.exec('BEGIN');
      try {
        client.db.update(scenes).set({ isActive: false, updatedAt: timestamp }).where(eq(scenes.chatId, chatId)).run();
        client.db.update(scenes).set({ isActive: true, updatedAt: timestamp }).where(eq(scenes.id, sceneId)).run();
        client.sqlite.exec('COMMIT');
      } catch {
        client.sqlite.exec('ROLLBACK');
        throw new Error('Failed to activate scene');
      }
      return mapScene(client.db.select().from(scenes).where(eq(scenes.id, sceneId)).get()!);
    },
  };
}

export function createCharacterStateRepository(client: SqliteDatabaseClient): CharacterStateRepository {
  return {
    async create(input) {
      const id = crypto.randomUUID();
      const timestamp = nowIso();

      client.db
        .insert(characterStates)
        .values({
          characterId: input.characterId,
          createdAt: timestamp,
          id,
          key: input.key,
          updatedAt: timestamp,
          value: input.value ?? '',
        })
        .run();

      return mapCharacterState(client.db.select().from(characterStates).where(eq(characterStates.id, id)).get()!);
    },
    async delete(id) {
      client.db.delete(characterStates).where(eq(characterStates.id, id)).run();
    },
    async getById(id) {
      const row = client.db.select().from(characterStates).where(eq(characterStates.id, id)).get();
      return row ? mapCharacterState(row) : null;
    },
    async listByCharacterId(characterId) {
      return client.db.select().from(characterStates).where(eq(characterStates.characterId, characterId)).orderBy(characterStates.key).all().map(mapCharacterState);
    },
    async update(id, input) {
      const existing = client.db.select().from(characterStates).where(eq(characterStates.id, id)).get();
      if (!existing) throw new Error(`character state ${id} was not found`);
      const timestamp = nowIso();

      client.db
        .update(characterStates)
        .set({
          key: input.key ?? existing.key,
          updatedAt: timestamp,
          value: input.value === undefined ? existing.value : input.value,
        })
        .where(eq(characterStates.id, id))
        .run();

      return mapCharacterState(client.db.select().from(characterStates).where(eq(characterStates.id, id)).get()!);
    },
  };
}

export function createRepositories(client: SqliteDatabaseClient): AppRepositories {
  return {
    appSettings: createAppSettingsRepository(client),
    characterStates: createCharacterStateRepository(client),
    characters: createCharacterRepository(client),
    chats: createChatRepository(client),
    messages: createMessageRepository(client),
    presets: createPresetRepository(client),
    providerConfigs: createProviderConfigRepository(client),
    scenes: createSceneRepository(client),
  };
}

export async function ensureProviderConfig(repository: ProviderConfigRepository, input: ProviderConfig): Promise<ProviderConfig> {
  return repository.upsert(input);
}
