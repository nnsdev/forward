import type { NormalizedStreamEvent, PromptPreview } from '@forward/shared';

export function createMockStreamEvents(chatId = 'chat_foundation', messageId = 'message_foundation'): NormalizedStreamEvent[] {
  return [
    {
      type: 'response.started',
      chatId,
      messageId,
    },
    {
      type: 'reasoning.delta',
      chatId,
      messageId,
      text: 'Inspect provider chunks and keep reasoning separate from answer text.',
    },
    {
      type: 'content.delta',
      chatId,
      messageId,
      text: 'Forward can stream content and thinking independently.',
    },
    {
      type: 'response.completed',
      chatId,
      messageId,
    },
  ];
}

export const mockPromptPreview: PromptPreview = {
  chatId: 'chat_foundation',
  formattedPrompt: 'You are roleplaying as Artemis.\n\nThe observatory is quiet tonight.\n\nWhat are you watching for?',
  provider: {
    id: 'provider_local',
    model: 'qwen',
    type: 'openai-compatible',
  },
  preset: {
    contextLength: 4096,
    frequencyPenalty: 0,
    id: 'preset_balanced',
    maxOutputTokens: 256,
    minP: 0.05,
    name: 'Balanced',
    presencePenalty: 0,
    repeatPenalty: 1,
    seed: null,
    stopStrings: [],
    structuredMode: false,
    temperature: 0.7,
    thinkingBudgetTokens: null,
    topK: 40,
    topP: 0.9,
  },
  templateName: 'Plain',
  tokenEstimate: 1264,
  truncation: {
    applied: false,
    droppedMessageIds: [],
  },
  messages: [
    {
      role: 'system',
      content: 'You are roleplaying as Artemis.',
    },
    {
      role: 'assistant',
      content: 'The observatory is quiet tonight.',
    },
    {
      role: 'user',
      content: 'What are you watching for?',
    },
  ],
};
