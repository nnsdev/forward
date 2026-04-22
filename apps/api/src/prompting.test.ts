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
  defaultPresetId: 'preset_balanced',
  defaultPresetMaxOutputTokens: 256,
  defaultPresetName: 'Balanced',
  defaultPresetStopStrings: [],
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
        id: 'preset_balanced',
        maxOutputTokens: 256,
        name: 'Balanced',
        stopStrings: [],
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
      },
      provider,
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
        chatId: 'chat_1',
        content: `Message ${index} ${'x'.repeat(400)}`,
        createdAt: new Date().toISOString(),
        id: `message_${index}`,
        reasoningContent: '',
        role: index % 2 === 0 ? 'user' : 'assistant',
        state: 'completed' as const,
        updatedAt: new Date().toISOString(),
      })),
      preset: {
        id: 'preset_balanced',
        maxOutputTokens: 256,
        name: 'Balanced',
        stopStrings: [],
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
      },
      provider,
    });

    expect(preview.truncation.applied).toBe(true);
    expect(preview.truncation.droppedMessageIds.length).toBeGreaterThan(0);
    expect(preview.messages[0]?.role).toBe('system');
    expect(preview.tokenEstimate).toBeLessThanOrEqual(2048);
  });
});
