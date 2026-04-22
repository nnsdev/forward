import type { Character, Message, Preset, PromptPreview, ProviderConfig } from '@forward/shared';

import type { AppConfig } from './config';

const MAX_PROMPT_TOKENS = 2048;

interface BuildPromptInput {
  character: Character | null;
  chatId: string;
  config: AppConfig;
  messages: Message[];
  preset: Preset;
  provider: ProviderConfig;
}

function compactSections(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join('\n\n');
}

function buildCharacterSystemPrompt(character: Character): string {
  return compactSections([
    `You are roleplaying as ${character.name}. Stay in character and respond naturally in conversation.`,
    character.description ? `Description:\n${character.description}` : undefined,
    character.personality ? `Personality:\n${character.personality}` : undefined,
    character.scenario ? `Scenario:\n${character.scenario}` : undefined,
    character.firstMessage ? `Opening line:\n${character.firstMessage}` : undefined,
    character.exampleDialogue ? `Example dialogue:\n${character.exampleDialogue}` : undefined,
  ]);
}

function estimateTokens(messages: Array<{ content: string }>): number {
  const totalCharacters = messages.reduce((sum, message) => sum + message.content.length, 0);

  return Math.max(1, Math.ceil(totalCharacters / 4));
}

export function buildPromptPreview(input: BuildPromptInput): PromptPreview {
  const systemPrompt = input.character
    ? buildCharacterSystemPrompt(input.character)
    : input.config.defaultAssistantSystemPrompt;

  const preservedMessages = [...input.messages];
  const droppedMessageIds: string[] = [];

  const promptMessages = [
    {
      content: systemPrompt,
      role: 'system' as const,
    },
  ];

  while (preservedMessages.length > 0) {
    const candidateMessages = [
      ...promptMessages,
      ...preservedMessages.map((message) => ({
        content: message.content,
        role: message.role,
      })),
    ];

    if (estimateTokens(candidateMessages) <= MAX_PROMPT_TOKENS) {
      break;
    }

    const removedMessage = preservedMessages.shift();

    if (removedMessage) {
      droppedMessageIds.push(removedMessage.id);
    }
  }

  const finalPromptMessages = [
    ...promptMessages,
    ...preservedMessages.map((message) => ({
      content: message.content,
      role: message.role,
    })),
  ];

  return {
    chatId: input.chatId,
    messages: finalPromptMessages,
    preset: {
      id: input.preset.id,
      name: input.preset.name,
    },
    provider: {
      id: input.provider.id,
      model: input.provider.model,
      type: input.provider.providerType,
    },
    tokenEstimate: estimateTokens(finalPromptMessages),
    truncation: {
      applied: droppedMessageIds.length > 0,
      droppedMessageIds,
    },
  };
}
