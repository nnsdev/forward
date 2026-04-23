import { describe, expect, it } from 'vitest';

import { buildPromptPreview } from './prompting';

const baseConfig = {
  appPassword: 'secret',
  databasePath: ':memory:',
  defaultAssistantSystemPrompt: 'You are a helpful assistant.',
  defaultProviderApiKeyEnvVar: null,
  defaultProviderBaseUrl: 'http://127.0.0.1:8080',
  defaultProviderId: 'provider_local',
  defaultProviderModel: 'qwen',
  defaultProviderName: 'Local qwen',
  defaultPresetContextLength: 4096,
  defaultPresetFrequencyPenalty: 0,
  defaultPresetId: 'preset_balanced',
  defaultPresetMaxOutputTokens: 256,
  defaultPresetMinP: 0.05,
  defaultPresetName: 'Balanced',
  defaultPresetPresencePenalty: 0,
  defaultPresetRepeatPenalty: 1,
  defaultPresetSeed: null,
  defaultPresetStopStrings: [],
  defaultPresetSystemPrompt: '',
  defaultPresetTemperature: 0.7,
  defaultPresetTopK: 40,
  defaultPresetTopP: 0.9,
  mediaRoot: '/tmp/forward-test-media',
  port: 3000,
  sessionSecret: 'session-secret',
  webOrigin: 'http://127.0.0.1:4173',
};

const provider = {
  apiKeyEnvVar: null,
  baseUrl: 'http://127.0.0.1:8080',
  id: 'provider_local',
  model: 'qwen',
  name: 'Local qwen',
  providerType: 'openai-compatible' as const,
  reasoningEnabled: true,
};

const settings = {
  createdAt: '2026-04-22T00:00:00.000Z',
  defaultPresetId: null,
  defaultProviderConfigId: null,
  id: 'app_settings',
  personaAvatarAssetPath: null,
  personaDescription: 'A quiet astronomer observing the scene.',
  personaName: 'Julien',
  showReasoningByDefault: false,
  updatedAt: '2026-04-22T00:00:00.000Z',
};

describe('buildPromptPreview', () => {
  it('builds a richer character system prompt', () => {
    const preview = buildPromptPreview({
      character: {
        avatarAssetPath: null,
        description: 'An observant astronomer.',
        exampleDialogue: 'Artemis peers into the dark.',
        firstMessage: 'The observatory is quiet tonight.',
        id: 'character_1',
        name: 'Artemis',
        personality: 'Calm and curious.',
        scenario: 'Watching a meteor shower.',
      },
      chatId: 'chat_1',
      config: baseConfig,
      messages: [],
      preset: {
        contextLength: 4096,
        frequencyPenalty: 0,
        id: 'preset_balanced',
        instructTemplate: null,
        maxOutputTokens: 256,
        minP: 0.05,
        name: 'Balanced',
        presencePenalty: 0,
        repeatPenalty: 1,
        seed: null,
        stopStrings: [],
        systemPrompt: '',
        temperature: 0.7,
        thinkingBudgetTokens: null,
        topK: 40,
        topP: 0.9,
      },
      provider,
      settings,
    });

    expect(preview.messages[0]?.content).toContain('You are roleplaying as Artemis');
    expect(preview.messages[0]?.content).toContain('Opening line:');
    expect(preview.messages[0]?.content).toContain('Example dialogue:');
  });

  it('drops oldest history when the prompt budget is exceeded', () => {
    const preview = buildPromptPreview({
      character: null,
      chatId: 'chat_1',
      config: baseConfig,
      messages: Array.from({ length: 30 }, (_, index) => ({
        attemptGroupId: null,
        attemptIndex: 0,
        chatId: 'chat_1',
        content: `Message ${index} ${'x'.repeat(400)}`,
        createdAt: new Date().toISOString(),
        id: `message_${index}`,
        isActiveAttempt: true,
        reasoningContent: '',
        role: index % 2 === 0 ? 'user' : 'assistant',
        state: 'completed' as const,
        updatedAt: new Date().toISOString(),
      })),
      preset: {
        contextLength: 2048,
        frequencyPenalty: 0,
        id: 'preset_balanced',
        instructTemplate: null,
        maxOutputTokens: 256,
        minP: 0.05,
        name: 'Balanced',
        presencePenalty: 0,
        repeatPenalty: 1,
        seed: null,
        stopStrings: [],
        systemPrompt: '',
        temperature: 0.7,
        thinkingBudgetTokens: null,
        topK: 40,
        topP: 0.9,
      },
      provider,
      settings,
    });

    expect(preview.truncation.applied).toBe(true);
    expect(preview.truncation.droppedMessageIds.length).toBeGreaterThan(0);
    expect(preview.messages[0]?.role).toBe('system');
    expect(preview.tokenEstimate).toBeLessThanOrEqual(2048);
  });

  it('injects persona into the system prompt for message mode', () => {
    const preview = buildPromptPreview({
      character: null,
      chatId: 'chat_1',
      config: baseConfig,
      messages: [],
      preset: {
        contextLength: 4096,
        frequencyPenalty: 0,
        id: 'preset_balanced',
        instructTemplate: null,
        maxOutputTokens: 256,
        minP: 0.05,
        name: 'Balanced',
        presencePenalty: 0,
        repeatPenalty: 1,
        seed: null,
        stopStrings: [],
        systemPrompt: '',
        temperature: 0.7,
        thinkingBudgetTokens: null,
        topK: 40,
        topP: 0.9,
      },
      provider,
      settings,
    });

    expect(preview.messages[0]?.content).toContain('User name:');
    expect(preview.messages[0]?.content).toContain('Julien');
    expect(preview.messages[0]?.content).toContain('User persona:');
  });

  it('folds leading assistant opening messages into the system prompt for message mode', () => {
    const preview = buildPromptPreview({
      character: {
        avatarAssetPath: null,
        description: 'An observant astronomer.',
        exampleDialogue: '',
        firstMessage: 'The observatory is quiet tonight.',
        id: 'character_1',
        name: 'Artemis',
        personality: 'Calm and curious.',
        scenario: 'Watching a meteor shower.',
      },
      chatId: 'chat_1',
      config: baseConfig,
      messages: [
        {
          attemptGroupId: 'attempt_1',
          attemptIndex: 0,
          chatId: 'chat_1',
          content: 'The observatory is quiet tonight.',
          createdAt: '2026-04-22T00:00:00.000Z',
          id: 'message_1',
          isActiveAttempt: true,
          reasoningContent: '',
          role: 'assistant',
          state: 'completed',
          updatedAt: '2026-04-22T00:00:00.000Z',
        },
        {
          attemptGroupId: null,
          attemptIndex: 0,
          chatId: 'chat_1',
          content: 'What are you watching for?',
          createdAt: '2026-04-22T00:00:01.000Z',
          id: 'message_2',
          isActiveAttempt: true,
          reasoningContent: '',
          role: 'user',
          state: 'completed',
          updatedAt: '2026-04-22T00:00:01.000Z',
        },
      ],
      preset: {
        contextLength: 4096,
        frequencyPenalty: 0,
        id: 'preset_balanced',
        instructTemplate: null,
        maxOutputTokens: 256,
        minP: 0.05,
        name: 'Balanced',
        presencePenalty: 0,
        repeatPenalty: 1,
        seed: null,
        stopStrings: [],
        systemPrompt: '',
        temperature: 0.7,
        thinkingBudgetTokens: null,
        topK: 40,
        topP: 0.9,
      },
      provider,
      settings,
    });

    expect(preview.messages[0]?.role).toBe('system');
    expect(preview.messages[0]?.content).toContain('Assistant opening 1:');
    expect(preview.messages[1]).toMatchObject({
      content: 'What are you watching for?',
      role: 'user',
    });
  });
});
