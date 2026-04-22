import { describe, expect, it } from 'vitest';

import { StreamEventSchema, serializeStreamEvent } from './streaming';

describe('StreamEventSchema', () => {
  it('accepts reasoning delta events', () => {
    const parsed = StreamEventSchema.parse({
      type: 'reasoning.delta',
      chatId: 'chat_1',
      messageId: 'message_1',
      text: 'Thinking...',
    });

    expect(parsed.type).toBe('reasoning.delta');

    if (parsed.type !== 'reasoning.delta') {
      throw new Error('expected reasoning delta event');
    }

    expect(parsed.text).toBe('Thinking...');
  });

  it('serializes SSE payloads with event names', () => {
    const output = serializeStreamEvent({
      type: 'content.delta',
      chatId: 'chat_1',
      messageId: 'message_1',
      text: 'Pong',
    });

    expect(output).toContain('event: content.delta');
    expect(output).toContain('Pong');
  });
});
