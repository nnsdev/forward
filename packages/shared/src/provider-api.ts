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
  maxOutputTokens: z.number().int().positive().max(1024).optional(),
  prompt: z.string().min(1),
  providerConfigId: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type LiveStreamRequest = z.infer<typeof LiveStreamRequestSchema>;
export type ProviderListResponse = z.infer<typeof ProviderListResponseSchema>;
export type ProviderModel = z.infer<typeof ProviderModelSchema>;
export type ProviderModelsResponse = z.infer<typeof ProviderModelsResponseSchema>;
