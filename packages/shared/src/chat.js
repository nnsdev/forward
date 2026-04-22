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
