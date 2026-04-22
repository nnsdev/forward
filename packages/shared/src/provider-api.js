import { z } from 'zod';
import { ProviderConfigSchema } from './chat';
export const ProviderModelSchema = z.object({
    id: z.string().min(1),
});
export const ProviderListResponseSchema = z.object({
    providers: z.array(ProviderConfigSchema),
});
export const ProviderModelsResponseSchema = z.object({
    models: z.array(ProviderModelSchema),
});
export const LiveStreamRequestSchema = z.object({
    maxOutputTokens: z.number().int().positive().max(512).optional(),
    prompt: z.string().min(1),
    providerConfigId: z.string().min(1).optional(),
    temperature: z.number().min(0).max(2).optional(),
});
