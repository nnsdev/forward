import type { MessageRole, ProviderConfig } from '@forward/shared';

export interface ProviderChunk {
  kind: 'reasoning' | 'content' | 'done' | 'error';
  error?: string;
  finishReason?: string | null;
  text?: string;
}

export interface ProviderModel {
  id: string;
}

export interface ChatCompletionMessage {
  content: string;
  role: MessageRole;
}

interface StreamGenerateBaseInput {
  contextLength?: number;
  frequencyPenalty?: number;
  maxOutputTokens?: number;
  minP?: number;
  model?: string;
  presencePenalty?: number;
  repeatPenalty?: number;
  seed?: number | null;
  stop?: string[];
  temperature?: number;
  thinkingBudgetTokens?: number | null;
  topK?: number;
  topP?: number;
}

export type StreamGenerateInput = StreamGenerateBaseInput & (
  | {
      messages: ChatCompletionMessage[];
      prompt?: never;
    }
  | {
      messages?: never;
      prompt: string;
    }
);

export interface ProviderAdapter {
  listModels(): Promise<ProviderModel[]>;
  streamGenerate(input: StreamGenerateInput): AsyncIterable<ProviderChunk>;
  validateConfig(): Promise<void>;
}

export type ProviderAdapterFactory = (config: ProviderConfig) => ProviderAdapter;
