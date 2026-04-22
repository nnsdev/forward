import { z } from 'zod';
export declare const PromptPreviewSchema: z.ZodObject<{
    chatId: z.ZodString;
    provider: z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        model: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        model: string;
        type: string;
    }, {
        id: string;
        model: string;
        type: string;
    }>;
    preset: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>;
    tokenEstimate: z.ZodNumber;
    truncation: z.ZodObject<{
        applied: z.ZodBoolean;
        droppedMessageIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        applied: boolean;
        droppedMessageIds: string[];
    }, {
        applied: boolean;
        droppedMessageIds: string[];
    }>;
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "system" | "user" | "assistant";
        content: string;
    }, {
        role: "system" | "user" | "assistant";
        content: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    messages: {
        role: "system" | "user" | "assistant";
        content: string;
    }[];
    chatId: string;
    tokenEstimate: number;
    provider: {
        id: string;
        model: string;
        type: string;
    };
    preset: {
        id: string;
        name: string;
    };
    truncation: {
        applied: boolean;
        droppedMessageIds: string[];
    };
}, {
    messages: {
        role: "system" | "user" | "assistant";
        content: string;
    }[];
    chatId: string;
    tokenEstimate: number;
    provider: {
        id: string;
        model: string;
        type: string;
    };
    preset: {
        id: string;
        name: string;
    };
    truncation: {
        applied: boolean;
        droppedMessageIds: string[];
    };
}>;
export type PromptPreview = z.infer<typeof PromptPreviewSchema>;
//# sourceMappingURL=prompt.d.ts.map