import { describe, expect, it } from 'vitest';

import {
  RetryChatInputSchema,
  UpdateMessageContentSchema,
  CreateProviderConfigInputSchema,
} from './chat';

describe('RetryChatInputSchema', () => {
  it('accepts empty object', () => {
    expect(RetryChatInputSchema.parse({})).toEqual({});
  });

  it('accepts optional fields', () => {
    expect(RetryChatInputSchema.parse({ maxOutputTokens: 256, temperature: 0.5 })).toEqual({
      maxOutputTokens: 256,
      temperature: 0.5,
    });
  });

  it('rejects invalid temperature', () => {
    expect(() => RetryChatInputSchema.parse({ temperature: 3 })).toThrow();
  });
});

describe('UpdateMessageContentSchema', () => {
  it('accepts valid content', () => {
    expect(UpdateMessageContentSchema.parse({ content: 'Hello' })).toEqual({ content: 'Hello' });
  });

  it('rejects empty content', () => {
    expect(() => UpdateMessageContentSchema.parse({ content: '' })).toThrow();
  });
});

describe('CreateProviderConfigInputSchema', () => {
  it('accepts valid provider config', () => {
    const result = CreateProviderConfigInputSchema.parse({
      baseUrl: 'http://localhost:8080',
      model: 'qwen',
      name: 'Test',
      providerType: 'openai-compatible',
    });

    expect(result.name).toBe('Test');
    expect(result.reasoningEnabled).toBe(false);
  });

  it('accepts optional apiKeyEnvVar', () => {
    const result = CreateProviderConfigInputSchema.parse({
      apiKeyEnvVar: 'MY_KEY',
      baseUrl: 'http://localhost:8080',
      model: 'qwen',
      name: 'Test',
      providerType: 'openai-compatible',
    });

    expect(result.apiKeyEnvVar).toBe('MY_KEY');
  });
});