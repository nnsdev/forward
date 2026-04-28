import { describe, expect, it } from 'vitest';

import { normalizeSillyTavernContext, normalizeSillyTavernInstruct } from './instruct';

describe('normalizeSillyTavernInstruct', () => {
  it('maps instruct template fields', () => {
    const result = normalizeSillyTavernInstruct({
      input_sequence: '[INST] ',
      name: 'Mistral',
      output_suffix: '</s>',
      story_string_prefix: '[INST] ',
      story_string_suffix: '[/INST]',
      system_same_as_user: true,
      user_alignment_message: 'Start now',
      wrap: false,
    });

    expect(result.name).toBe('Mistral');
    expect(result.inputSequence).toBe('[INST] ');
    expect(result.outputSuffix).toBe('</s>');
    expect(result.storyStringPrefix).toBe('[INST] ');
    expect(result.storyStringSuffix).toBe('[/INST]');
    expect(result.systemSameAsUser).toBe(true);
    expect(result.userAlignmentMessage).toBe('Start now');
    expect(result.wrap).toBe(false);
  });

  it('extracts reasoning fields from nested reasoning object', () => {
    const result = normalizeSillyTavernInstruct({
      input_sequence: '<|turn>user\n',
      name: 'Gemma',
      output_sequence: '<|turn>model\n',
      reasoning: {
        prefix: '<|channel>thought',
        separator: '\n\n',
        suffix: '<channel|>',
      },
    });

    expect(result.reasoningPrefix).toBe('<|channel>thought');
    expect(result.reasoningSuffix).toBe('<channel|>');
    expect(result.reasoningSeparator).toBe('\n\n');
  });

  it('extracts reasoning fields from flat prefixed keys', () => {
    const result = normalizeSillyTavernInstruct({
      input_sequence: '<|turn>user\n',
      name: 'Gemma',
      reasoning_prefix: '<think>',
      reasoning_separator: '\n',
      reasoning_suffix: '</think>',
    });

    expect(result.reasoningPrefix).toBe('<think>');
    expect(result.reasoningSuffix).toBe('</think>');
    expect(result.reasoningSeparator).toBe('\n');
  });
});

describe('normalizeSillyTavernContext', () => {
  it('maps context template fields', () => {
    const result = normalizeSillyTavernContext({
      chat_start: 'Conversation starts here',
      example_separator: '***',
      name: 'ChatML',
      story_string: '{{#if system}}{{system}}{{/if}}{{trim}}',
    });

    expect(result.name).toBe('ChatML');
    expect(result.chatStart).toBe('Conversation starts here');
    expect(result.exampleSeparator).toBe('***');
    expect(result.storyStringTemplate).toContain('{{system}}');
  });
});
