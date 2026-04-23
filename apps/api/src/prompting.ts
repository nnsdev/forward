import type { AppSettings, Character, InstructTemplate, Message, Preset, PromptPreview, ProviderConfig } from '@forward/shared';
import { PLAIN_TEMPLATE } from '@forward/shared';

import type { AppConfig } from './config';

const DEFAULT_MAX_PROMPT_TOKENS = 131072;

interface BuildPromptInput {
  authorNote?: string;
  authorNoteDepth?: number;
  character: Character | null;
  chatId: string;
  config: AppConfig;
  countTokens(text: string): Promise<number>;
  messages: Message[];
  preset: Preset;
  provider: ProviderConfig;
  settings: AppSettings;
}

function resolveMacros(text: string, characterName: string, userName: string): string {
  return text
    .replace(/\{\{char\}\}/g, characterName)
    .replace(/\{\{user\}\}/g, userName);
}

function compactSections(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join('\n\n');
}

function resolveMacrosInCharacter(character: Character, userName: string): Character {
  return {
    ...character,
    description: resolveMacros(character.description, character.name, userName),
    exampleDialogue: resolveMacros(character.exampleDialogue, character.name, userName),
    firstMessage: resolveMacros(character.firstMessage, character.name, userName),
    personality: resolveMacros(character.personality, character.name, userName),
    scenario: resolveMacros(character.scenario, character.name, userName),
  };
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

function buildPersonaSection(settings: AppSettings): string | undefined {
  if (!settings.personaName.trim() && !settings.personaDescription.trim()) {
    return undefined;
  }

  return compactSections([
    settings.personaName.trim() ? `User name:\n${settings.personaName.trim()}` : undefined,
    settings.personaDescription.trim() ? `User persona:\n${settings.personaDescription.trim()}` : undefined,
  ]);
}

function normalizeMessageModeHistory(systemPrompt: string, messages: Message[]): {
  messages: Message[];
  systemPrompt: string;
} {
  const leadingAssistantMessages: Message[] = [];
  let firstUserSeen = false;

  for (const message of messages) {
    if (message.role === 'user') {
      firstUserSeen = true;
      break;
    }

    if (!firstUserSeen && message.role === 'assistant') {
      leadingAssistantMessages.push(message);
      continue;
    }

    break;
  }

  if (leadingAssistantMessages.length === 0) {
    return { messages, systemPrompt };
  }

  const openingTranscript = leadingAssistantMessages
    .map((message, index) => `Assistant opening ${index + 1}:\n${message.content}`)
    .join('\n\n');

  return {
    messages: messages.slice(leadingAssistantMessages.length),
    systemPrompt: compactSections([
      systemPrompt,
      openingTranscript,
    ]),
  };
}

function getActiveConversationMessages(messages: Message[]): Message[] {
  return messages.filter((message) => message.role !== 'assistant' || message.isActiveAttempt !== false);
}

function filterSummarizedMessages(messages: Message[]): Message[] {
  const coveredIds = new Set<string>();

  for (const message of messages) {
    for (const id of (message.summaryOf ?? [])) {
      coveredIds.add(id);
    }
  }

  return messages.filter((message) => !coveredIds.has(message.id));
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

function buildStoryString(character: Character | null, systemPrompt: string, template: InstructTemplate, settings: AppSettings): string {
  const storyTemplate = template.storyStringTemplate || '{{#if system}}{{system}}{{/if}}{{trim}}';

  return renderStoryStringTemplate(storyTemplate, {
    anchorAfter: '',
    anchorBefore: '',
    description: character?.description ?? '',
    personality: character?.personality ?? '',
    persona: settings.personaDescription ?? '',
    scenario: character?.scenario ?? '',
    system: systemPrompt,
    user: settings.personaName ?? '',
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

export async function buildPromptPreview(input: BuildPromptInput): Promise<PromptPreview> {
  const template = resolveTemplate(input.preset);
  const characterName = input.character?.name ?? 'Assistant';
  const userName = input.settings.personaName.trim() || 'User';

  const resolvedCharacter = input.character
    ? resolveMacrosInCharacter(input.character, userName)
    : null;
  const resolvedAuthorNote = input.authorNote?.trim()
    ? resolveMacros(input.authorNote.trim(), characterName, userName)
    : undefined;
  const resolvedPresetSystemPrompt = input.preset.systemPrompt
    ? resolveMacros(input.preset.systemPrompt, characterName, userName)
    : '';

  const baseSystemPrompt = resolvedCharacter
    ? buildCharacterSystemPrompt(resolvedCharacter, resolvedPresetSystemPrompt)
    : (resolvedPresetSystemPrompt || input.config.defaultAssistantSystemPrompt);

  const authorNoteDepth = input.authorNoteDepth ?? 0;
  const shouldInjectAuthorNoteIntoSystem = authorNoteDepth === 0 && resolvedAuthorNote;
  const mergedSystemPrompt = compactSections([
    baseSystemPrompt,
    buildPersonaSection(input.settings),
    shouldInjectAuthorNoteIntoSystem ? `Author's note:\n${resolvedAuthorNote}` : undefined,
  ]);

  const maxPromptTokens = input.preset.contextLength ?? DEFAULT_MAX_PROMPT_TOKENS;

  const activeMessages = filterSummarizedMessages(getActiveConversationMessages(input.messages));
  const normalizedMessageModeHistory = normalizeMessageModeHistory(mergedSystemPrompt, activeMessages);
  const initialMessages = input.preset.instructTemplate
    ? [...activeMessages]
    : normalizedMessageModeHistory.messages;
  const systemPrompt = input.preset.instructTemplate
    ? mergedSystemPrompt
    : normalizedMessageModeHistory.systemPrompt;
  const preservedMessages = [...initialMessages];
  const droppedMessageIds: string[] = [];

  // Insert author's note at configured depth (depth > 0 = N messages from the end)
  if (authorNoteDepth > 0 && resolvedAuthorNote) {
    const insertIndex = Math.max(0, preservedMessages.length - authorNoteDepth);
    preservedMessages.splice(insertIndex, 0, {
      content: resolvedAuthorNote,
      role: 'system',
    } as Message);
  }

  const storyStringContent = input.preset.instructTemplate
    ? buildStoryString(resolvedCharacter, mergedSystemPrompt, template, input.settings)
    : systemPrompt;
  const storyString = formatStoryString(template, storyStringContent);
  const exampleDialogue = buildExampleDialogue(resolvedCharacter, template);

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

    if ((await input.countTokens(combined)) <= maxPromptTokens) {
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
      thinkingBudgetTokens: input.preset.thinkingBudgetTokens,
      topK: input.preset.topK,
      topP: input.preset.topP,
    },
    provider: {
      id: input.provider.id,
      model: input.provider.model,
      type: input.provider.providerType,
    },
    templateName: template.name,
    tokenEstimate: await input.countTokens(finalRawContent),
    truncation: {
      applied: droppedMessageIds.length > 0,
      droppedMessageIds,
    },
  };
}
