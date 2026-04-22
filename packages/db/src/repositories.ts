import { desc, eq } from 'drizzle-orm';

import type {
  Character,
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
  UpdateCharacterInput,
  UpdateChatInput,
  UpdatePresetInput,
  UpdateProviderConfigInput,
} from '@forward/shared';
import { CharacterSchema, ChatSchema, MessageSchema, PresetSchema, ProviderConfigSchema } from '@forward/shared';

import type { SqliteDatabaseClient } from './client';
import { characters, chats, messages, presets, providerConfigs } from './schema';

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
  chatId: string;
  content: string;
  reasoningContent?: string;
  role: MessageRole;
  state?: MessageState;
}

export interface MessageRepository {
  appendContent(id: string, delta: string): Promise<Message>;
  appendReasoning(id: string, delta: string): Promise<Message>;
  create(input: CreateMessageInput): Promise<Message>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Message | null>;
  listByChatId(chatId: string): Promise<Message[]>;
  updateContent(id: string, content: string): Promise<Message>;
  updateState(id: string, state: MessageState): Promise<Message>;
}

export interface AppRepositories {
  characters: CharacterRepository;
  chats: ChatRepository;
  messages: MessageRepository;
  presets: PresetRepository;
  providerConfigs: ProviderConfigRepository;
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
    id: row.id,
    maxOutputTokens: row.maxOutputTokens,
    name: row.name,
    stopStrings: JSON.parse(row.stopStringsJson) as string[],
    temperature: row.temperature,
    topK: row.topK,
    topP: row.topP,
  });
}

function mapChat(row: typeof chats.$inferSelect): Chat {
  return ChatSchema.parse({
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
    chatId: row.chatId,
    content: row.content,
    createdAt: row.createdAt,
    id: row.id,
    reasoningContent: row.reasoningContent,
    role: row.role,
    state: row.state,
    updatedAt: row.updatedAt,
  });
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
          createdAt: timestamp,
          id,
          maxOutputTokens: input.maxOutputTokens,
          name: input.name,
          stopStringsJson: JSON.stringify(input.stopStrings),
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
            maxOutputTokens: input.maxOutputTokens,
            name: input.name,
            stopStringsJson: JSON.stringify(input.stopStrings),
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
            createdAt: timestamp,
            id: input.id,
            maxOutputTokens: input.maxOutputTokens,
            name: input.name,
            stopStringsJson: JSON.stringify(input.stopStrings),
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
          maxOutputTokens: input.maxOutputTokens ?? existing.maxOutputTokens,
          name: input.name ?? existing.name,
          stopStringsJson: JSON.stringify(input.stopStrings ?? JSON.parse(existing.stopStringsJson)),
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

      client.db
        .insert(messages)
        .values({
          chatId: input.chatId,
          content: input.content,
          createdAt: timestamp,
          id,
          reasoningContent: input.reasoningContent ?? '',
          role: input.role,
          state: input.state ?? 'completed',
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

export function createRepositories(client: SqliteDatabaseClient): AppRepositories {
  return {
    characters: createCharacterRepository(client),
    chats: createChatRepository(client),
    messages: createMessageRepository(client),
    presets: createPresetRepository(client),
    providerConfigs: createProviderConfigRepository(client),
  };
}

export async function ensureProviderConfig(repository: ProviderConfigRepository, input: ProviderConfig): Promise<ProviderConfig> {
  return repository.upsert(input);
}
