import { z } from 'zod';
export declare const MessageRoleSchema: z.ZodEnum<["system", "user", "assistant"]>;
export declare const MessageStateSchema: z.ZodEnum<["pending", "streaming", "completed", "cancelled", "failed"]>;
export declare const CharacterSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    personality: z.ZodDefault<z.ZodString>;
    scenario: z.ZodDefault<z.ZodString>;
    firstMessage: z.ZodDefault<z.ZodString>;
    exampleDialogue: z.ZodDefault<z.ZodString>;
    avatarAssetPath: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    personality: string;
    scenario: string;
    firstMessage: string;
    exampleDialogue: string;
    avatarAssetPath: string | null;
}, {
    id: string;
    name: string;
    avatarAssetPath: string | null;
    description?: string | undefined;
    personality?: string | undefined;
    scenario?: string | undefined;
    firstMessage?: string | undefined;
    exampleDialogue?: string | undefined;
}>;
export declare const ProviderTypeSchema: z.ZodEnum<["openai-compatible"]>;
export declare const ProviderConfigSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    providerType: z.ZodEnum<["openai-compatible"]>;
    baseUrl: z.ZodString;
    model: z.ZodString;
    apiKeyEnvVar: z.ZodNullable<z.ZodString>;
    reasoningEnabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    providerType: "openai-compatible";
    baseUrl: string;
    model: string;
    apiKeyEnvVar: string | null;
    reasoningEnabled: boolean;
}, {
    id: string;
    name: string;
    providerType: "openai-compatible";
    baseUrl: string;
    model: string;
    apiKeyEnvVar: string | null;
    reasoningEnabled?: boolean | undefined;
}>;
export declare const PresetSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    temperature: z.ZodNumber;
    topP: z.ZodNumber;
    topK: z.ZodNumber;
    maxOutputTokens: z.ZodNumber;
    stopStrings: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    stopStrings: string[];
}, {
    id: string;
    name: string;
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    stopStrings: string[];
}>;
export declare const MessageSchema: z.ZodObject<{
    id: z.ZodString;
    chatId: z.ZodString;
    role: z.ZodEnum<["system", "user", "assistant"]>;
    content: z.ZodString;
    reasoningContent: z.ZodDefault<z.ZodString>;
    state: z.ZodEnum<["pending", "streaming", "completed", "cancelled", "failed"]>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    chatId: string;
    role: "system" | "user" | "assistant";
    content: string;
    reasoningContent: string;
    state: "pending" | "streaming" | "completed" | "cancelled" | "failed";
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    chatId: string;
    role: "system" | "user" | "assistant";
    content: string;
    state: "pending" | "streaming" | "completed" | "cancelled" | "failed";
    reasoningContent?: string | undefined;
}>;
export declare const ChatSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    characterId: z.ZodNullable<z.ZodString>;
    presetId: z.ZodNullable<z.ZodString>;
    providerConfigId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    characterId: string | null;
    presetId: string | null;
    providerConfigId: string | null;
}, {
    id: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    characterId: string | null;
    presetId: string | null;
    providerConfigId: string | null;
}>;
export declare const CreateChatInputSchema: z.ZodObject<{
    title: z.ZodString;
    characterId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    presetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    providerConfigId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    characterId?: string | null | undefined;
    presetId?: string | null | undefined;
    providerConfigId?: string | null | undefined;
}, {
    title: string;
    characterId?: string | null | undefined;
    presetId?: string | null | undefined;
    providerConfigId?: string | null | undefined;
}>;
export type Character = z.infer<typeof CharacterSchema>;
export type Chat = z.infer<typeof ChatSchema>;
export type CreateChatInput = z.infer<typeof CreateChatInputSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export type MessageState = z.infer<typeof MessageStateSchema>;
export type Preset = z.infer<typeof PresetSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ProviderType = z.infer<typeof ProviderTypeSchema>;
//# sourceMappingURL=chat.d.ts.map