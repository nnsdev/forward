import { z } from 'zod';

const StreamEventBaseSchema = z.object({
  chatId: z.string().min(1),
  messageId: z.string().min(1),
});

export const ResponseStartedEventSchema = StreamEventBaseSchema.extend({
  type: z.literal('response.started'),
});

export const ReasoningDeltaEventSchema = StreamEventBaseSchema.extend({
  type: z.literal('reasoning.delta'),
  text: z.string().min(1),
});

export const ContentDeltaEventSchema = StreamEventBaseSchema.extend({
  type: z.literal('content.delta'),
  text: z.string().min(1),
});

export const ResponseCompletedEventSchema = StreamEventBaseSchema.extend({
  type: z.literal('response.completed'),
});

export const ResponseErrorEventSchema = StreamEventBaseSchema.extend({
  type: z.literal('response.error'),
  error: z.string().min(1),
});

export const StreamEventSchema = z.discriminatedUnion('type', [
  ResponseStartedEventSchema,
  ReasoningDeltaEventSchema,
  ContentDeltaEventSchema,
  ResponseCompletedEventSchema,
  ResponseErrorEventSchema,
]);

export type NormalizedStreamEvent = z.infer<typeof StreamEventSchema>;
export type StreamEventType = NormalizedStreamEvent['type'];

export function serializeStreamEvent(event: NormalizedStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
