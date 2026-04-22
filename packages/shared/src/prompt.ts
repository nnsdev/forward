import { z } from 'zod';

export const PromptPreviewSchema = z.object({
  chatId: z.string().min(1),
  provider: z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    model: z.string().min(1),
  }),
  preset: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
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
