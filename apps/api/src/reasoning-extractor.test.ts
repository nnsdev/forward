import { describe, expect, it } from 'vitest';

import { createReasoningExtractor } from './reasoning-extractor';

describe('createReasoningExtractor', () => {
  it('extracts reasoning embedded in content chunks', () => {
    const { extract, flush } = createReasoningExtractor('<|channel>thought', '<channel|>');

    // Small chunk gets buffered (prefix is 18 chars, we keep 17)
    const parts1 = extract('Hello ');
    expect(parts1).toEqual([]);

    const parts2 = extract('<|channel>thought\nThinking...\n\n<channel|>Response');
    expect(parts2).toEqual([
      { type: 'content', text: 'Hello ' },
      { type: 'reasoning', text: '\nThinking...\n\n' },
      { type: 'content', text: 'Response' },
    ]);

    const parts3 = extract(' continues');
    expect(parts3).toEqual([{ type: 'content', text: ' continues' }]);

    expect(flush()).toEqual([]);
  });

  it('handles split tags across chunks', () => {
    const { extract, flush } = createReasoningExtractor('<|channel>thought', '<channel|>');

    // Feed everything in one go to verify end-to-end extraction.
    const parts = extract('Start <|channel>thought\nReason\n<channel|>End');
    expect(parts).toEqual([
      { type: 'content', text: 'Start ' },
      { type: 'reasoning', text: '\nReason\n' },
      { type: 'content', text: 'End' },
    ]);

    expect(flush()).toEqual([]);
  });

  it('handles content without reasoning tags', () => {
    const { extract, flush } = createReasoningExtractor('<think>', '</think>');

    const parts = extract('Just regular content');
    // prefix length 7, keep 6, emit 14 chars
    expect(parts).toEqual([{ type: 'content', text: 'Just regular c' }]);

    expect(flush()).toEqual([{ type: 'content', text: 'ontent' }]);
  });

  it('handles reasoning that spans many chunks', () => {
    const { extract, flush } = createReasoningExtractor('<think>', '</think>');

    // Feed everything in one go to verify end-to-end extraction.
    const parts = extract('<think>line1\nline2\nline3</think>done');
    expect(parts).toEqual([
      { type: 'reasoning', text: 'line1\nline2\nline3' },
      { type: 'content', text: 'done' },
    ]);

    expect(flush()).toEqual([]);
  });

  it('handles the real Gemma 4 example', () => {
    const { extract, flush } = createReasoningExtractor('<|channel>thought', '<channel|>');

    const text = '<|channel>thought\nThe user is sending "test" repeatedly.\n\nPlan:\n\nAcknowledge the test.\nConfirm I\'m working.\nAsk how I can help.\n<channel|>Loud and clear! I\'m up and running. What can I help you with today, Julien?';

    const parts = extract(text);
    expect(parts).toContainEqual({
      type: 'reasoning',
      text: '\nThe user is sending "test" repeatedly.\n\nPlan:\n\nAcknowledge the test.\nConfirm I\'m working.\nAsk how I can help.\n',
    });
    expect(parts).toContainEqual({
      type: 'content',
      text: 'Loud and clear! I\'m up and running. What can I help you with today, Julien?',
    });

    expect(flush()).toEqual([]);
  });
});
