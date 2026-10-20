import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Reveal from './Reveal';

describe('Reveal', () => {
  it('renders its children as the requested element', () => {
    render(
      <Reveal component="li" data-testid="reveal">
        content
      </Reveal>
    );

    expect(screen.getByTestId('reveal').tagName).toBe('LI');
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  // jsdom has no IntersectionObserver, so content reveals immediately
  it('marks itself visible once revealed', async () => {
    render(
      <Reveal data-testid="reveal" sx={[{ marginTop: '4px' }]}>
        content
      </Reveal>
    );

    await waitFor(() =>
      expect(screen.getByTestId('reveal')).toHaveAttribute('data-visible', 'true')
    );
  });
});
