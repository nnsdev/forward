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

export interface StreamGenerateInput {
  maxOutputTokens?: number;
  messages: ChatCompletionMessage[];
  model?: string;
  stop?: string[];
  temperature?: number;
  topP?: number;
}

export interface ProviderAdapter {
  listModels(): Promise<ProviderModel[]>;
  streamGenerate(input: StreamGenerateInput): AsyncIterable<ProviderChunk>;
  validateConfig(): Promise<void>;
}

export type ProviderAdapterFactory = (config: ProviderConfig) => ProviderAdapter;
