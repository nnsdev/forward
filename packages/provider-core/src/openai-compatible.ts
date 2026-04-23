import type { ProviderConfig } from '@forward/shared';

import type { ChatCompletionMessage, ProviderAdapter, ProviderChunk, ProviderModel, StreamGenerateInput } from './contracts';

interface OpenAIModelResponse {
  data?: Array<{
    id: string;
  }>;
}

interface OpenAIChoiceChunk {
  delta?: {
    content?: string | null;
    reasoning_content?: string | null;
  };
  finish_reason?: string | null;
  text?: string | null;
}

interface OpenAIChatCompletionChunk {
  choices?: OpenAIChoiceChunk[];
}

export interface OpenAICompatibleAdapterOptions {
  apiKey?: string | null;
  config: ProviderConfig;
  fetchFn?: typeof fetch;
}

export function extractSseDataPayloads(streamPayload: string): string[] {
  return streamPayload
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);
}

export function normalizeOpenAIChatCompletionChunk(input: string | OpenAIChatCompletionChunk): ProviderChunk[] {
  if (typeof input === 'string' && input === '[DONE]') {
    return [{ kind: 'done' }];
  }

  const chunk = typeof input === 'string' ? (JSON.parse(input) as OpenAIChatCompletionChunk) : input;
  const choice = chunk.choices?.[0];

  if (!choice) {
    return [];
  }

  const normalized: ProviderChunk[] = [];

  if (choice.delta?.reasoning_content) {
    normalized.push({
      kind: 'reasoning',
      text: choice.delta.reasoning_content,
    });
  }

  if (choice.delta?.content) {
    normalized.push({
      kind: 'content',
      text: choice.delta.content,
    });
  }

  if (choice.text) {
    normalized.push({
      kind: 'content',
      text: choice.text,
    });
  }

  if (choice.finish_reason) {
    normalized.push({
      kind: 'done',
      finishReason: choice.finish_reason,
    });
  }

  return normalized;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function buildHeaders(apiKey?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

function parseModelResponse(payload: OpenAIModelResponse): ProviderModel[] {
  return (payload.data ?? []).map((model) => ({ id: model.id }));
}

function hasPrompt(input: StreamGenerateInput): input is StreamGenerateInput & { prompt: string } {
  return typeof (input as { prompt?: unknown }).prompt === 'string';
}

async function* iterateSseChunks(response: Response): AsyncIterable<ProviderChunk> {
  if (!response.body) {
    throw new Error('provider response body was empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawDone = false;

  while (true) {
    const { done, value } = await reader.read();

    buffer += decoder.decode(value, { stream: !done });

    let separatorIndex = buffer.indexOf('\n\n');

    while (separatorIndex !== -1) {
      const frame = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      for (const payload of extractSseDataPayloads(frame)) {
        for (const chunk of normalizeOpenAIChatCompletionChunk(payload)) {
          if (chunk.kind === 'done') {
            sawDone = true;
          }

          yield chunk;
        }
      }

      separatorIndex = buffer.indexOf('\n\n');
    }

    if (done) {
      break;
    }
  }

  const trailingPayloads = extractSseDataPayloads(buffer.trim());

  for (const payload of trailingPayloads) {
    for (const chunk of normalizeOpenAIChatCompletionChunk(payload)) {
      if (chunk.kind === 'done') {
        sawDone = true;
      }

      yield chunk;
    }
  }

  if (!sawDone) {
    yield { kind: 'done' };
  }
}

function buildChatCompletionBody(config: ProviderConfig, input: StreamGenerateInput & { messages: ChatCompletionMessage[] }): Record<string, unknown> {
  const body: Record<string, unknown> = {
    max_tokens: input.maxOutputTokens ?? 128,
    messages: input.messages,
    model: input.model ?? config.model,
    stream: true,
  };

  if (input.temperature !== undefined) {
    body.temperature = input.temperature;
  }

  if (input.topP !== undefined) {
    body.top_p = input.topP;
  }

  if (input.topK !== undefined) {
    body.top_k = input.topK;
  }

  if (input.minP !== undefined) {
    body.min_p = input.minP;
  }

  if (input.frequencyPenalty !== undefined) {
    body.frequency_penalty = input.frequencyPenalty;
  }

  if (input.presencePenalty !== undefined) {
    body.presence_penalty = input.presencePenalty;
  }

  if (input.repeatPenalty !== undefined) {
    body.repeat_penalty = input.repeatPenalty;
  }

  if (input.seed !== undefined && input.seed !== null) {
    body.seed = input.seed;
  }

  if (input.contextLength !== undefined) {
    body.num_ctx = input.contextLength;
  }

  if (input.stop?.length) {
    body.stop = input.stop;
  }

  if (input.thinkingBudgetTokens !== undefined && input.thinkingBudgetTokens !== null) {
    body.thinking_budget_tokens = input.thinkingBudgetTokens;
  }

  return body;
}

function buildCompletionBody(config: ProviderConfig, input: StreamGenerateInput & { prompt: string }): Record<string, unknown> {
  const body: Record<string, unknown> = {
    max_tokens: input.maxOutputTokens ?? 128,
    model: input.model ?? config.model,
    prompt: input.prompt,
    stream: true,
  };

  if (input.temperature !== undefined) {
    body.temperature = input.temperature;
  }

  if (input.topP !== undefined) {
    body.top_p = input.topP;
  }

  if (input.topK !== undefined) {
    body.top_k = input.topK;
  }

  if (input.minP !== undefined) {
    body.min_p = input.minP;
  }

  if (input.frequencyPenalty !== undefined) {
    body.frequency_penalty = input.frequencyPenalty;
  }

  if (input.presencePenalty !== undefined) {
    body.presence_penalty = input.presencePenalty;
  }

  if (input.repeatPenalty !== undefined) {
    body.repeat_penalty = input.repeatPenalty;
  }

  if (input.seed !== undefined && input.seed !== null) {
    body.seed = input.seed;
  }

  if (input.contextLength !== undefined) {
    body.num_ctx = input.contextLength;
  }

  if (input.stop?.length) {
    body.stop = input.stop;
  }

  if (input.thinkingBudgetTokens !== undefined && input.thinkingBudgetTokens !== null) {
    body.thinking_budget_tokens = input.thinkingBudgetTokens;
  }

  return body;
}

export function createOpenAICompatibleAdapter(options: OpenAICompatibleAdapterOptions): ProviderAdapter {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = normalizeBaseUrl(options.config.baseUrl);
  const headers = buildHeaders(options.apiKey);

  return {
    async listModels() {
      const response = await fetchFn(`${baseUrl}/v1/models`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`provider model listing failed with ${response.status}`);
      }

      const payload = (await response.json()) as OpenAIModelResponse;

      return parseModelResponse(payload);
    },
    async *streamGenerate(input) {
      let endpoint = '/v1/chat/completions';
      let body: Record<string, unknown>;

      if (hasPrompt(input)) {
        endpoint = '/v1/completions';
        body = buildCompletionBody(options.config, input);
      } else {
        body = buildChatCompletionBody(options.config, input);
      }

      const response = await fetchFn(`${baseUrl}${endpoint}`, {
        body: JSON.stringify(body),
        headers,
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`provider generation failed with ${response.status}: ${errorText}`);
      }

      yield* iterateSseChunks(response);
    },
    async validateConfig() {
      await this.listModels();
    },
  };
}
