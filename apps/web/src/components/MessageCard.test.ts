import { fireEvent, render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import MessageCard from './MessageCard.vue';

describe('MessageCard', () => {
  it('hides reasoning by default and reveals it on demand', async () => {
    render(MessageCard, {
      props: {
        role: 'assistant',
        content: 'Answer text',
        reasoning: 'Reasoning text',
      },
    });

    expect(screen.queryByText('Reasoning text')).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Show thinking' }));

    expect(screen.getByText('Reasoning text')).toBeInTheDocument();
  });
});
