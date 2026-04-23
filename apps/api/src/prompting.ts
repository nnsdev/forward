import type { Character, InstructTemplate, Message, Preset, PromptPreview, ProviderConfig } from '@forward/shared';
import { PLAIN_TEMPLATE } from '@forward/shared';

import type { AppConfig } from './config';

const DEFAULT_MAX_PROMPT_TOKENS = 131072;

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

function buildCharacterSystemPrompt(character: Character, systemPromptOverride: string): string {
  return compactSections([
    systemPromptOverride || `You are roleplaying as ${character.name}. Stay in character and respond naturally in conversation.`,
    character.description ? `Description:\n${character.description}` : undefined,
    character.personality ? `Personality:\n${character.personality}` : undefined,
    character.scenario ? `Scenario:\n${character.scenario}` : undefined,
    character.firstMessage ? `Opening line:\n${character.firstMessage}` : undefined,
    character.exampleDialogue ? `Example dialogue:\n${character.exampleDialogue}` : undefined,
  ]);
}

function renderStoryStringTemplate(
  template: string,
  values: Record<string, string>,
): string {
  const withConditionals = template.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (_, key: string, content: string) => {
    return values[key]?.trim() ? content : '';
  });

  const withVariables = withConditionals.replace(/{{(\w+)}}/g, (_, key: string) => values[key] ?? '');
  const trimmed = withVariables.replace(/{{trim}}/g, '');

  return trimmed.trim();
}

function buildStoryString(character: Character | null, systemPrompt: string, template: InstructTemplate): string {
  const storyTemplate = template.storyStringTemplate || '{{#if system}}{{system}}{{/if}}{{trim}}';

  return renderStoryStringTemplate(storyTemplate, {
    anchorAfter: '',
    anchorBefore: '',
    description: character?.description ?? '',
    personality: character?.personality ?? '',
    persona: '',
    scenario: character?.scenario ?? '',
    system: systemPrompt,
    wiAfter: '',
    wiBefore: '',
  });
}

function buildExampleDialogue(character: Character | null, template: InstructTemplate): string {
  if (!character?.exampleDialogue.trim()) {
    return '';
  }

  if (!template.exampleSeparator) {
    return character.exampleDialogue.trim();
  }

  return character.exampleDialogue.replaceAll('<START>', template.exampleSeparator).trim();
}

function resolveTemplate(preset: Preset): InstructTemplate {
  return preset.instructTemplate ?? PLAIN_TEMPLATE;
}

function estimateTokens(messages: Array<{ content: string }>): number {
  const totalCharacters = messages.reduce((sum, message) => sum + message.content.length, 0);

  return Math.max(1, Math.ceil(totalCharacters / 4));
}

function formatStoryString(template: InstructTemplate, content: string): string {
  if (template.storyStringPrefix || template.storyStringSuffix) {
    return `${template.storyStringPrefix}${content}${template.storyStringSuffix}`;
  }

  const prefix = template.systemSameAsUser ? template.inputSequence : (template.systemSequence || template.systemPrefix);

  return `${prefix}${content}${template.systemSuffix}`;
}

function formatMessage(template: InstructTemplate, role: 'system' | 'user' | 'assistant', content: string, isFirst: boolean, isLast: boolean): string {
  switch (role) {
    case 'system': {
      if (template.systemSameAsUser) {
        return `${template.inputSequence}${content}${template.inputSuffix}`;
      }

      return `${template.systemPrefix || template.systemSequence}${content}${template.systemSuffix}`;
    }
    case 'user': {
      const prefix = isFirst && template.firstInputSequence ? template.firstInputSequence : (isLast && template.lastInputSequence ? template.lastInputSequence : template.inputSequence);
      const suffix = template.inputSuffix;

      return `${prefix}${content}${suffix}`;
    }
    case 'assistant': {
      const prefix = isFirst && template.firstOutputSequence ? template.firstOutputSequence : (isLast && template.lastOutputSequence ? template.lastOutputSequence : template.outputSequence);
      const suffix = template.outputSuffix;

      return `${prefix}${content}${suffix}`;
    }
  }
}

export function buildPromptPreview(input: BuildPromptInput): PromptPreview {
  const template = resolveTemplate(input.preset);
  const systemPrompt = input.character
    ? buildCharacterSystemPrompt(input.character, input.preset.systemPrompt)
    : (input.preset.systemPrompt || input.config.defaultAssistantSystemPrompt);

  const maxPromptTokens = input.preset.contextLength ?? DEFAULT_MAX_PROMPT_TOKENS;

  const preservedMessages = [...input.messages];
  const droppedMessageIds: string[] = [];

  const storyStringContent = input.preset.instructTemplate
    ? buildStoryString(input.character, input.preset.systemPrompt || input.config.defaultAssistantSystemPrompt, template)
    : systemPrompt;
  const storyString = formatStoryString(template, storyStringContent);
  const exampleDialogue = buildExampleDialogue(input.character, template);

  const promptParts: string[] = [storyString];

  if (exampleDialogue) {
    promptParts.push(exampleDialogue);
  }

  if (template.chatStart) {
    promptParts.push(template.chatStart);
  }

  if (template.userAlignmentMessage) {
    promptParts.push(formatMessage(template, 'user', template.userAlignmentMessage, false, false));
  }

  while (preservedMessages.length > 0) {
    const candidateParts = [
      ...promptParts,
      ...preservedMessages.map((message) => formatMessage(template, message.role, message.content, false, false)),
    ];

    const combined = candidateParts.join('\n');

    if (estimateTokens([{ content: combined }]) <= maxPromptTokens) {
      break;
    }

    const removedMessage = preservedMessages.shift();

    if (removedMessage) {
      droppedMessageIds.push(removedMessage.id);
    }
  }

  const formattedMessages = preservedMessages.map((message, index) => {
    const isFirst = index === 0;
    const isLast = index === preservedMessages.length - 1;

    return formatMessage(template, message.role, message.content, isFirst, isLast);
  });

  const finalRawContent = [...promptParts, ...formattedMessages].join('\n');

  return {
    chatId: input.chatId,
    formattedPrompt: finalRawContent,
    messages: [
      { content: systemPrompt, role: 'system' },
      ...preservedMessages.map((message) => ({
        content: message.content,
        role: message.role,
      })),
    ],
    preset: {
      contextLength: input.preset.contextLength,
      frequencyPenalty: input.preset.frequencyPenalty,
      id: input.preset.id,
      maxOutputTokens: input.preset.maxOutputTokens,
      minP: input.preset.minP,
      name: input.preset.name,
      presencePenalty: input.preset.presencePenalty,
      repeatPenalty: input.preset.repeatPenalty,
      seed: input.preset.seed,
      stopStrings: input.preset.stopStrings,
      temperature: input.preset.temperature,
      topK: input.preset.topK,
      topP: input.preset.topP,
    },
    provider: {
      id: input.provider.id,
      model: input.provider.model,
      type: input.provider.providerType,
    },
    templateName: template.name,
    tokenEstimate: estimateTokens([{ content: finalRawContent }]),
    truncation: {
      applied: droppedMessageIds.length > 0,
      droppedMessageIds,
    },
  };
}
