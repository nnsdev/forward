import { z } from 'zod';

export const PromptPreviewSchema = z.object({
  chatId: z.string().min(1),
  formattedPrompt: z.string(),
  provider: z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    model: z.string().min(1),
  }),
  preset: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    contextLength: z.number().int().positive(),
    frequencyPenalty: z.number(),
    maxOutputTokens: z.number().int().positive(),
    minP: z.number(),
    presencePenalty: z.number(),
    repeatPenalty: z.number(),
    seed: z.number().int().nullable(),
    stopStrings: z.array(z.string()),
    temperature: z.number(),
    topK: z.number().int().nonnegative(),
    topP: z.number(),
  }),
  templateName: z.string(),
  tokenEstimate: z.number().int().nonnegative(),
  truncation: z.object({
    applied: z.boolean(),
    droppedMessageIds: z.array(z.string()),
  }),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    }),
  ),
});

export type PromptPreview = z.infer<typeof PromptPreviewSchema>;
