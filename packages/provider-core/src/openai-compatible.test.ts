import { describe, expect, it, vi } from 'vitest';

import { createOpenAICompatibleAdapter, extractSseDataPayloads, normalizeOpenAIChatCompletionChunk } from './openai-compatible';

describe('openai-compatible normalization', () => {
  it('extracts SSE data payloads', () => {
    const payloads = extractSseDataPayloads('data: {"foo":1}\n\ndata: [DONE]\n\n');

    expect(payloads).toEqual(['{"foo":1}', '[DONE]']);
  });

  it('normalizes reasoning and content deltas separately', () => {
    const chunks = normalizeOpenAIChatCompletionChunk({
      choices: [
        {
          delta: {
            reasoning_content: 'Thinking',
            content: 'Pong',
          },
          finish_reason: null,
        },
      ],
    });

    expect(chunks).toEqual([
      { kind: 'reasoning', text: 'Thinking' },
      { kind: 'content', text: 'Pong' },
    ]);
  });

  it('normalizes the OpenAI done sentinel', () => {
    expect(normalizeOpenAIChatCompletionChunk('[DONE]')).toEqual([{ kind: 'done' }]);
  });

  it('lists models through the adapter', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 'qwen' }, { id: 'roci' }] })));
    const adapter = createOpenAICompatibleAdapter({
      config: {
        apiKeyEnvVar: null,
        baseUrl: 'http://127.0.0.1:8080',
        id: 'provider_local',
        model: 'qwen',
        name: 'Local qwen',
        providerType: 'openai-compatible',
        reasoningEnabled: true,
      },
      fetchFn,
    });

    await expect(adapter.listModels()).resolves.toEqual([{ id: 'qwen' }, { id: 'roci' }]);
    expect(fetchFn).toHaveBeenCalledWith('http://127.0.0.1:8080/v1/models', expect.any(Object));
  });

  it('streams reasoning and content through the adapter', async () => {
    const fetchFn = vi.fn(async () => {
      const encoder = new TextEncoder();

      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                'data: {"choices":[{"delta":{"reasoning_content":"Thinking"},"finish_reason":null}]}\n\n' +
                  'data: {"choices":[{"delta":{"content":"Pong"},"finish_reason":null}]}\n\n' +
                  'data: [DONE]\n\n',
              ),
            );
            controller.close();
          },
        }),
      );
    });

    const adapter = createOpenAICompatibleAdapter({
      config: {
        apiKeyEnvVar: null,
        baseUrl: 'http://127.0.0.1:8080',
        id: 'provider_local',
        model: 'qwen',
        name: 'Local qwen',
        providerType: 'openai-compatible',
        reasoningEnabled: true,
      },
      fetchFn,
    });

    const chunks = [];

    for await (const chunk of adapter.streamGenerate({
      maxOutputTokens: 64,
      messages: [{ content: 'Reply with pong', role: 'user' }],
      temperature: 0,
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { kind: 'reasoning', text: 'Thinking' },
      { kind: 'content', text: 'Pong' },
      { kind: 'done' },
    ]);
  });
});
