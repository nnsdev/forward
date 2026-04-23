import { describe, expect, it, vi } from 'vitest';

import { createOpenAICompatibleAdapter } from './openai-compatible';

const providerConfig = {
  apiKeyEnvVar: null,
  baseUrl: 'http://127.0.0.1:8080',
  id: 'provider_local',
  model: 'qwen',
  name: 'Local qwen',
  providerType: 'openai-compatible' as const,
  reasoningEnabled: true,
};

describe('createOpenAICompatibleAdapter', () => {
  it('uses chat completions for message-based generation', async () => {
    const fetchFn = vi.fn(async () => new Response('data: [DONE]\n\n', { status: 200 }));
    const adapter = createOpenAICompatibleAdapter({ config: providerConfig, fetchFn: fetchFn as typeof fetch });

    const chunks = [];

    for await (const chunk of adapter.streamGenerate({
      maxOutputTokens: 128,
      messages: [{ content: 'Hello', role: 'user' }],
    })) {
      chunks.push(chunk);
    }

    expect(fetchFn).toHaveBeenCalledWith(
      'http://127.0.0.1:8080/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(chunks.at(-1)).toMatchObject({ kind: 'done' });
  });

  it('uses completions for raw prompt generation', async () => {
    const fetchFn = vi.fn(async () => new Response('data: {"choices":[{"text":"Hello world"}]}\n\ndata: [DONE]\n\n', { status: 200 }));
    const adapter = createOpenAICompatibleAdapter({ config: providerConfig, fetchFn: fetchFn as typeof fetch });

    const chunks = [];

    for await (const chunk of adapter.streamGenerate({
      maxOutputTokens: 128,
      prompt: 'Formatted prompt',
    })) {
      chunks.push(chunk);
    }

    expect(fetchFn).toHaveBeenCalledWith(
      'http://127.0.0.1:8080/v1/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(chunks).toContainEqual({ kind: 'content', text: 'Hello world' });
  });

  it('forwards thinking budget tokens when provided', async () => {
    const fetchFn = vi.fn(async () => new Response('data: [DONE]\n\n', { status: 200 }));
    const adapter = createOpenAICompatibleAdapter({ config: providerConfig, fetchFn: fetchFn as typeof fetch });

    for await (const _chunk of adapter.streamGenerate({
      maxOutputTokens: 128,
      messages: [{ content: 'Hello', role: 'user' }],
      thinkingBudgetTokens: 64,
    })) {
      void _chunk;
    }

    const calls = fetchFn.mock.calls as unknown as Array<[unknown, { body?: string } | undefined]>;
    const firstCall = calls[0];
    expect(firstCall).toBeTruthy();
    const requestInit = firstCall?.[1] ?? {};
    expect(requestInit.body).toContain('"thinking_budget_tokens":64');
  });
});
