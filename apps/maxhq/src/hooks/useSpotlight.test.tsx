import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { spotlightSx, useSpotlight } from './useSpotlight';
import theme from '../theme';

function Probe() {
  const { onPointerMove } = useSpotlight();

  return <div data-testid="card" onPointerMove={onPointerMove} />;
}

describe('useSpotlight', () => {
  it('writes the pointer position relative to the element', () => {
    render(<Probe />);
    const card = screen.getByTestId('card');
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20 } as DOMRect);

    fireEvent.pointerMove(card, { clientX: 110, clientY: 70 });

    expect(card.style.getPropertyValue('--x')).toBe('100px');
    expect(card.style.getPropertyValue('--y')).toBe('50px');
  });

  it('paints the light from the tracked position', () => {
    const styles = spotlightSx(theme);

    expect(styles['&::before'].background).toContain('var(--x, 50%) var(--y, 0%)');
  });
});
