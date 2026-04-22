import { z } from 'zod';
export declare const LoginRequestSchema: z.ZodObject<{
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
}, {
    password: string;
}>;
export declare const SessionResponseSchema: z.ZodObject<{
    authenticated: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    authenticated: boolean;
}, {
    authenticated: boolean;
}>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
//# sourceMappingURL=auth.d.ts.map