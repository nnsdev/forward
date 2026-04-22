import { z } from 'zod';
export declare const ResponseStartedEventSchema: z.ZodObject<{
    chatId: z.ZodString;
    messageId: z.ZodString;
} & {
    type: z.ZodLiteral<"response.started">;
}, "strip", z.ZodTypeAny, {
    chatId: string;
    type: "response.started";
    messageId: string;
}, {
    chatId: string;
    type: "response.started";
    messageId: string;
}>;
export declare const ReasoningDeltaEventSchema: z.ZodObject<{
    chatId: z.ZodString;
    messageId: z.ZodString;
} & {
    type: z.ZodLiteral<"reasoning.delta">;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
    chatId: string;
    type: "reasoning.delta";
    messageId: string;
}, {
    text: string;
    chatId: string;
    type: "reasoning.delta";
    messageId: string;
}>;
export declare const ContentDeltaEventSchema: z.ZodObject<{
    chatId: z.ZodString;
    messageId: z.ZodString;
} & {
    type: z.ZodLiteral<"content.delta">;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
    chatId: string;
    type: "content.delta";
    messageId: string;
}, {
    text: string;
    chatId: string;
    type: "content.delta";
    messageId: string;
}>;
export declare const ResponseCompletedEventSchema: z.ZodObject<{
    chatId: z.ZodString;
    messageId: z.ZodString;
} & {
    type: z.ZodLiteral<"response.completed">;
}, "strip", z.ZodTypeAny, {
    chatId: string;
    type: "response.completed";
    messageId: string;
}, {
    chatId: string;
    type: "response.completed";
    messageId: string;
}>;
export declare const ResponseErrorEventSchema: z.ZodObject<{
    chatId: z.ZodString;
    messageId: z.ZodString;
} & {
    type: z.ZodLiteral<"response.error">;
    error: z.ZodString;
}, "strip", z.ZodTypeAny, {
    chatId: string;
    type: "response.error";
    messageId: string;
    error: string;
}, {
    chatId: string;
    type: "response.error";
    messageId: string;
    error: string;
}>;
export declare const StreamEventSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    chatId: z.ZodString;
    messageId: z.ZodString;
} & {
    type: z.ZodLiteral<"response.started">;
}, "strip", z.ZodTypeAny, {
    chatId: string;
    type: "response.started";
    messageId: string;
}, {
    chatId: string;
    type: "response.started";
    messageId: string;
}>, z.ZodObject<{
    chatId: z.ZodString;
    messageId: z.ZodString;
} & {
    type: z.ZodLiteral<"reasoning.delta">;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
    chatId: string;
    type: "reasoning.delta";
    messageId: string;
}, {
    text: string;
    chatId: string;
    type: "reasoning.delta";
    messageId: string;
}>, z.ZodObject<{
    chatId: z.ZodString;
    messageId: z.ZodString;
} & {
    type: z.ZodLiteral<"content.delta">;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
    chatId: string;
    type: "content.delta";
    messageId: string;
}, {
    text: string;
    chatId: string;
    type: "content.delta";
    messageId: string;
}>, z.ZodObject<{
    chatId: z.ZodString;
    messageId: z.ZodString;
} & {
    type: z.ZodLiteral<"response.completed">;
}, "strip", z.ZodTypeAny, {
    chatId: string;
    type: "response.completed";
    messageId: string;
}, {
    chatId: string;
    type: "response.completed";
    messageId: string;
}>, z.ZodObject<{
    chatId: z.ZodString;
    messageId: z.ZodString;
} & {
    type: z.ZodLiteral<"response.error">;
    error: z.ZodString;
}, "strip", z.ZodTypeAny, {
    chatId: string;
    type: "response.error";
    messageId: string;
    error: string;
}, {
    chatId: string;
    type: "response.error";
    messageId: string;
    error: string;
}>]>;
export type NormalizedStreamEvent = z.infer<typeof StreamEventSchema>;
export type StreamEventType = NormalizedStreamEvent['type'];
export declare function serializeStreamEvent(event: NormalizedStreamEvent): string;
//# sourceMappingURL=streaming.d.ts.map