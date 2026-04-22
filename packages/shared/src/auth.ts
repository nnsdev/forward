import { z } from 'zod';

export const LoginRequestSchema = z.object({
  password: z.string().min(1),
});

export const SessionResponseSchema = z.object({
  authenticated: z.boolean(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
