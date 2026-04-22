import { describe, expect, it } from 'vitest';

import { createOpenAICompatibleAdapter } from './openai-compatible';

const runLiveTests = process.env.FORWARD_RUN_LIVE_TESTS === '1';
const liveBaseUrl = process.env.FORWARD_LIVE_PROVIDER_URL ?? 'http://192.168.178.68:8082';
const liveModel = process.env.FORWARD_LIVE_PROVIDER_MODEL ?? 'qwen';

const liveDescribe = runLiveTests ? describe : describe.skip;

liveDescribe('openai-compatible live endpoint', () => {
  const adapter = createOpenAICompatibleAdapter({
    config: {
      apiKeyEnvVar: null,
      baseUrl: liveBaseUrl,
      id: 'provider_live',
      model: liveModel,
      name: 'Live provider',
      providerType: 'openai-compatible',
      reasoningEnabled: true,
    },
  });

  it('lists available models', async () => {
    const models = await adapter.listModels();

    expect(models.length).toBeGreaterThan(0);
    expect(models.some((model) => model.id === liveModel)).toBe(true);
  }, 30_000);

  it('streams at least one normalized event from the provider', async () => {
    const chunks = [];

    for await (const chunk of adapter.streamGenerate({
      maxOutputTokens: 48,
      messages: [{ content: 'Reply with the single word pong.', role: 'user' }],
      temperature: 0,
    })) {
      chunks.push(chunk);
    }

    expect(chunks.some((chunk) => chunk.kind === 'reasoning' || chunk.kind === 'content')).toBe(true);
    expect(chunks.some((chunk) => chunk.kind === 'done')).toBe(true);
  }, 60_000);
});
