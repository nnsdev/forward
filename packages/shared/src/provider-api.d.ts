import { z } from 'zod';
export declare const ProviderModelSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const ProviderListResponseSchema: z.ZodObject<{
    providers: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    providers: {
        id: string;
        name: string;
        providerType: "openai-compatible";
        baseUrl: string;
        model: string;
        apiKeyEnvVar: string | null;
        reasoningEnabled: boolean;
    }[];
}, {
    providers: {
        id: string;
        name: string;
        providerType: "openai-compatible";
        baseUrl: string;
        model: string;
        apiKeyEnvVar: string | null;
        reasoningEnabled?: boolean | undefined;
    }[];
}>;
export declare const ProviderModelsResponseSchema: z.ZodObject<{
    models: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    models: {
        id: string;
    }[];
}, {
    models: {
        id: string;
    }[];
}>;
export declare const LiveStreamRequestSchema: z.ZodObject<{
    maxOutputTokens: z.ZodOptional<z.ZodNumber>;
    prompt: z.ZodString;
    providerConfigId: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    temperature?: number | undefined;
    maxOutputTokens?: number | undefined;
    providerConfigId?: string | undefined;
}, {
    prompt: string;
    temperature?: number | undefined;
    maxOutputTokens?: number | undefined;
    providerConfigId?: string | undefined;
}>;
export type LiveStreamRequest = z.infer<typeof LiveStreamRequestSchema>;
export type ProviderListResponse = z.infer<typeof ProviderListResponseSchema>;
export type ProviderModel = z.infer<typeof ProviderModelSchema>;
export type ProviderModelsResponse = z.infer<typeof ProviderModelsResponseSchema>;
//# sourceMappingURL=provider-api.d.ts.map