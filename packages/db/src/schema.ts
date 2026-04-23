import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
};

export const providerConfigs = sqliteTable('provider_configs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  providerType: text('provider_type').notNull(),
  baseUrl: text('base_url').notNull(),
  model: text('model').notNull(),
  apiKeyEnvVar: text('api_key_env_var'),
  reasoningEnabled: integer('reasoning_enabled', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
});

export const presets = sqliteTable('presets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull().default(''),
  instructTemplateJson: text('instruct_template_json').notNull().default(''),
  thinkingBudgetTokens: integer('thinking_budget_tokens').$type<number | null>(),
  temperature: real('temperature').notNull(),
  topP: real('top_p').notNull(),
  topK: integer('top_k').notNull(),
  minP: real('min_p').notNull().default(0.05),
  frequencyPenalty: real('frequency_penalty').notNull().default(0).$type<number>(),
  presencePenalty: real('presence_penalty').notNull().default(0).$type<number>(),
  repeatPenalty: real('repeat_penalty').notNull().default(1).$type<number>(),
  seed: integer('seed').$type<number | null>(),
  contextLength: integer('context_length').notNull().default(131072).$type<number>(),
  maxOutputTokens: integer('max_output_tokens').notNull(),
  stopStringsJson: text('stop_strings_json').notNull(),
  ...timestamps,
});

export const characters = sqliteTable('characters', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  personality: text('personality').notNull(),
  scenario: text('scenario').notNull(),
  firstMessage: text('first_message').notNull(),
  exampleDialogue: text('example_dialogue').notNull(),
  avatarAssetPath: text('avatar_asset_path'),
  ...timestamps,
});

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  characterId: text('character_id'),
  presetId: text('preset_id'),
  providerConfigId: text('provider_config_id'),
  authorNote: text('author_note').notNull().default(''),
  authorNoteDepth: integer('author_note_depth').notNull().default(0),
  ...timestamps,
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  attemptGroupId: text('attempt_group_id'),
  attemptIndex: integer('attempt_index').notNull().default(0),
  isActiveAttempt: integer('is_active_attempt', { mode: 'boolean' }).notNull().default(true),
  role: text('role').notNull(),
  content: text('content').notNull(),
  reasoningContent: text('reasoning_content').notNull().default(''),
  state: text('state').notNull(),
  summaryOf: text('summary_of').notNull().default(''),
  tokenEstimate: integer('token_estimate'),
  ...timestamps,
});

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey(),
  defaultProviderConfigId: text('default_provider_config_id'),
  defaultPresetId: text('default_preset_id'),
  personaAvatarAssetPath: text('persona_avatar_asset_path'),
  personaDescription: text('persona_description').notNull().default(''),
  personaName: text('persona_name').notNull().default('User'),
  showReasoningByDefault: integer('show_reasoning_by_default', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  sessionTokenHash: text('session_token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull(),
});

export const schema = {
  appSettings,
  characters,
  chats,
  messages,
  presets,
  providerConfigs,
  sessions,
};
