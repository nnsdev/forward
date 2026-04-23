import { describe, expect, it } from 'vitest';

import {
  RetryChatInputSchema,
  UpdateMessageContentSchema,
  CreateProviderConfigInputSchema,
  CreatePresetInputSchema,
  PresetSchema,
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

describe('CreatePresetInputSchema', () => {
  it('applies defaults for optional fields', () => {
    const result = CreatePresetInputSchema.parse({
      maxOutputTokens: 256,
      name: 'Test',
      stopStrings: [],
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
    });

    expect(result.contextLength).toBe(131072);
    expect(result.frequencyPenalty).toBe(0);
    expect(result.minP).toBe(0.05);
    expect(result.presencePenalty).toBe(0);
    expect(result.repeatPenalty).toBe(1);
    expect(result.seed).toBeNull();
  });

  it('accepts all fields explicitly', () => {
    const result = CreatePresetInputSchema.parse({
      contextLength: 8192,
      frequencyPenalty: 0.5,
      maxOutputTokens: 512,
      minP: 0.1,
      name: 'Precise',
      presencePenalty: 0.3,
      repeatPenalty: 1.15,
      seed: 42,
      stopStrings: ['END'],
      temperature: 0.2,
      topK: 20,
      topP: 0.8,
    });

    expect(result.contextLength).toBe(8192);
    expect(result.frequencyPenalty).toBe(0.5);
    expect(result.minP).toBe(0.1);
    expect(result.presencePenalty).toBe(0.3);
    expect(result.repeatPenalty).toBe(1.15);
    expect(result.seed).toBe(42);
  });
});

describe('PresetSchema', () => {
  it('includes all generation parameters', () => {
    const result = PresetSchema.parse({
      contextLength: 131072,
      frequencyPenalty: 0,
      id: 'preset_test',
      maxOutputTokens: 256,
      minP: 0.05,
      name: 'Test',
      presencePenalty: 0,
      repeatPenalty: 1,
      seed: null,
      stopStrings: [],
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
    });

    expect(result.contextLength).toBe(131072);
    expect(result.frequencyPenalty).toBe(0);
    expect(result.minP).toBe(0.05);
    expect(result.presencePenalty).toBe(0);
    expect(result.repeatPenalty).toBe(1);
    expect(result.seed).toBeNull();
  });
});