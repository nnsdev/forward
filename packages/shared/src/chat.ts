import { z } from 'zod';

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

export const PresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  topK: z.number().int().nonnegative(),
  maxOutputTokens: z.number().int().positive(),
  stopStrings: z.array(z.string()),
});

export const CreatePresetInputSchema = z.object({
  name: z.string().min(1),
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  topK: z.number().int().nonnegative(),
  maxOutputTokens: z.number().int().positive(),
  stopStrings: z.array(z.string()),
});

export const UpdatePresetInputSchema = CreatePresetInputSchema.partial().extend({
  name: z.string().min(1).optional(),
});

export const MessageSchema = z.object({
  id: z.string().min(1),
  chatId: z.string().min(1),
  role: MessageRoleSchema,
  content: z.string(),
  reasoningContent: z.string().default(''),
  state: MessageStateSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ChatSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  characterId: z.string().min(1).nullable(),
  presetId: z.string().min(1).nullable(),
  providerConfigId: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateChatInputSchema = z.object({
  title: z.string().min(1),
  characterId: z.string().min(1).nullable().optional(),
  presetId: z.string().min(1).nullable().optional(),
  providerConfigId: z.string().min(1).nullable().optional(),
});

export const UpdateChatInputSchema = z
  .object({
    characterId: z.string().min(1).nullable().optional(),
    presetId: z.string().min(1).nullable().optional(),
    providerConfigId: z.string().min(1).nullable().optional(),
    title: z.string().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be updated');

export const CreateMessageInputSchema = z.object({
  content: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']).default('user'),
});

export const GenerateChatInputSchema = z.object({
  content: z.string().min(1),
  maxOutputTokens: z.number().int().positive().max(512).optional(),
  providerConfigId: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type Character = z.infer<typeof CharacterSchema>;
export type Chat = z.infer<typeof ChatSchema>;
export type CreateChatInput = z.infer<typeof CreateChatInputSchema>;
export type CreateCharacterInput = z.infer<typeof CreateCharacterInputSchema>;
export type CreateMessageInput = z.infer<typeof CreateMessageInputSchema>;
export type CreatePresetInput = z.infer<typeof CreatePresetInputSchema>;
export type GenerateChatInput = z.infer<typeof GenerateChatInputSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export type MessageState = z.infer<typeof MessageStateSchema>;
export type Preset = z.infer<typeof PresetSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ProviderType = z.infer<typeof ProviderTypeSchema>;
export type UpdateCharacterInput = z.infer<typeof UpdateCharacterInputSchema>;
export type UpdateChatInput = z.infer<typeof UpdateChatInputSchema>;
export type UpdatePresetInput = z.infer<typeof UpdatePresetInputSchema>;
