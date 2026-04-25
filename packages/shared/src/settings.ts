import { z } from 'zod';

export const DisplayModeSchema = z.enum(['chat', 'novel', 'script']);

export const AppSettingsSchema = z.object({
  id: z.string().min(1),
  defaultPresetId: z.string().min(1).nullable(),
  defaultProviderConfigId: z.string().min(1).nullable(),
  personaAvatarAssetPath: z.string().nullable(),
  personaDescription: z.string(),
  personaName: z.string(),
  showReasoningByDefault: z.boolean(),
  displayMode: DisplayModeSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UpdateAppSettingsInputSchema = z
  .object({
    defaultPresetId: z.string().min(1).nullable().optional(),
    defaultProviderConfigId: z.string().min(1).nullable().optional(),
    personaAvatarAssetPath: z.string().nullable().optional(),
    personaDescription: z.string().optional(),
    personaName: z.string().optional(),
    showReasoningByDefault: z.boolean().optional(),
    displayMode: DisplayModeSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be updated');

export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type UpdateAppSettingsInput = z.infer<typeof UpdateAppSettingsInputSchema>;
