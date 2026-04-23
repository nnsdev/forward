import { z } from 'zod';

import { InstructTemplateSchema } from './instruct';

export const MessageRoleSchema = z.enum(['system', 'user', 'assistant']);
export const MessageStateSchema = z.enum([
  'pending',
  'streaming',
  'completed',
  'cancelled',
  'failed',
]);

export const CharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  personality: z.string().default(''),
  scenario: z.string().default(''),
  firstMessage: z.string().default(''),
  exampleDialogue: z.string().default(''),
  avatarAssetPath: z.string().nullable(),
});

export const CreateCharacterInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  personality: z.string().default(''),
  scenario: z.string().default(''),
  firstMessage: z.string().default(''),
  exampleDialogue: z.string().default(''),
  avatarAssetPath: z.string().nullable().optional(),
});

export const UpdateCharacterInputSchema = CreateCharacterInputSchema.partial().extend({
  name: z.string().min(1).optional(),
});

export const ProviderTypeSchema = z.enum(['openai-compatible']);

export const ProviderConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  providerType: ProviderTypeSchema,
  baseUrl: z.string().url(),
  model: z.string().min(1),
  apiKeyEnvVar: z.string().min(1).nullable(),
  reasoningEnabled: z.boolean().default(false),
});

export const CreateProviderConfigInputSchema = z.object({
  name: z.string().min(1),
  providerType: ProviderTypeSchema,
  baseUrl: z.string().url(),
  model: z.string().min(1),
  apiKeyEnvVar: z.string().min(1).nullable().optional(),
  reasoningEnabled: z.boolean().default(false),
});

export const UpdateProviderConfigInputSchema = CreateProviderConfigInputSchema.partial().extend({
  name: z.string().min(1).optional(),
});

export const PresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  systemPrompt: z.string(),
  instructTemplate: InstructTemplateSchema.nullable(),
  thinkingBudgetTokens: z.number().int().nonnegative().nullable(),
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  topK: z.number().int().nonnegative(),
  minP: z.number().min(0).max(1),
  frequencyPenalty: z.number().min(0).max(2),
  presencePenalty: z.number().min(0).max(2),
  repeatPenalty: z.number().min(1),
  seed: z.number().int().nullable(),
  contextLength: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  stopStrings: z.array(z.string()),
});

export const CreatePresetInputSchema = z.object({
  name: z.string().min(1),
  systemPrompt: z.string().default(''),
  instructTemplate: InstructTemplateSchema.nullable().default(null),
  thinkingBudgetTokens: z.number().int().nonnegative().nullable().default(null),
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  topK: z.number().int().nonnegative(),
  minP: z.number().min(0).max(1).default(0.05),
  frequencyPenalty: z.number().min(0).max(2).default(0),
  presencePenalty: z.number().min(0).max(2).default(0),
  repeatPenalty: z.number().min(1).default(1),
  seed: z.number().int().nullable().default(null),
  contextLength: z.number().int().positive().default(131072),
  maxOutputTokens: z.number().int().positive(),
  stopStrings: z.array(z.string()),
});

export const UpdatePresetInputSchema = z.object({
  name: z.string().min(1).optional(),
  systemPrompt: z.string().optional(),
  instructTemplate: InstructTemplateSchema.nullable().optional(),
  thinkingBudgetTokens: z.number().int().nonnegative().nullable().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().nonnegative().optional(),
  minP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(0).max(2).optional(),
  presencePenalty: z.number().min(0).max(2).optional(),
  repeatPenalty: z.number().min(1).optional(),
  seed: z.number().int().nullable().optional(),
  contextLength: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  stopStrings: z.array(z.string()).optional(),
});

export const MessageSchema = z.object({
  attemptGroupId: z.string().min(1).nullable().default(null),
  attemptIndex: z.number().int().nonnegative().default(0),
  id: z.string().min(1),
  isActiveAttempt: z.boolean().default(true),
  chatId: z.string().min(1),
  role: MessageRoleSchema,
  content: z.string(),
  reasoningContent: z.string().default(''),
  state: MessageStateSchema,
  summaryOf: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ChatSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  characterId: z.string().min(1).nullable(),
  presetId: z.string().min(1).nullable(),
  providerConfigId: z.string().min(1).nullable(),
  authorNote: z.string().default(''),
  authorNoteDepth: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateChatInputSchema = z.object({
  title: z.string().min(1),
  characterId: z.string().min(1).nullable().optional(),
  presetId: z.string().min(1).nullable().optional(),
  providerConfigId: z.string().min(1).nullable().optional(),
  authorNote: z.string().default(''),
  authorNoteDepth: z.number().int().nonnegative().default(0),
});

export const UpdateChatInputSchema = z
  .object({
    characterId: z.string().min(1).nullable().optional(),
    presetId: z.string().min(1).nullable().optional(),
    providerConfigId: z.string().min(1).nullable().optional(),
    title: z.string().min(1).optional(),
    authorNote: z.string().optional(),
    authorNoteDepth: z.number().int().nonnegative().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be updated');

export const CreateMessageInputSchema = z.object({
  content: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']).default('user'),
});

export const GenerateChatInputSchema = z.object({
  content: z.string().min(1),
  maxOutputTokens: z.number().int().positive().max(1024).optional(),
  providerConfigId: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const UpdateMessageContentSchema = z.object({
  content: z.string().min(1),
});

export const RetryChatInputSchema = z.object({
  maxOutputTokens: z.number().int().positive().max(1024).optional(),
  providerConfigId: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type Character = z.infer<typeof CharacterSchema>;
export type Chat = z.infer<typeof ChatSchema>;
export type CreateChatInput = z.infer<typeof CreateChatInputSchema>;
export type CreateCharacterInput = z.infer<typeof CreateCharacterInputSchema>;
export type CreateMessageInput = z.infer<typeof CreateMessageInputSchema>;
export type CreatePresetInput = z.infer<typeof CreatePresetInputSchema>;
export type CreateProviderConfigInput = z.infer<typeof CreateProviderConfigInputSchema>;
export type GenerateChatInput = z.infer<typeof GenerateChatInputSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export type MessageState = z.infer<typeof MessageStateSchema>;
export type Preset = z.infer<typeof PresetSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ProviderType = z.infer<typeof ProviderTypeSchema>;
export type UpdateCharacterInput = z.infer<typeof UpdateCharacterInputSchema>;
export type UpdateChatInput = z.infer<typeof UpdateChatInputSchema>;
export type UpdateMessageContentInput = z.infer<typeof UpdateMessageContentSchema>;
export type UpdatePresetInput = z.infer<typeof UpdatePresetInputSchema>;
export type UpdateProviderConfigInput = z.infer<typeof UpdateProviderConfigInputSchema>;
export type RetryChatInput = z.infer<typeof RetryChatInputSchema>;
