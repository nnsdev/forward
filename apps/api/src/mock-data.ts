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
  provider: {
    id: 'provider_local',
    model: 'qwen',
    type: 'openai-compatible',
  },
  preset: {
    id: 'preset_balanced',
    name: 'Balanced',
  },
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
