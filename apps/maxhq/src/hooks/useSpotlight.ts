import type { Theme } from '@mui/material/styles';
import type { PointerEvent } from 'react';
import { primaryTint } from '../theme';

// tracks the pointer in --x/--y on the hovered element, without re-rendering
export function useSpotlight() {
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    element.style.setProperty('--x', `${event.clientX - rect.left}px`);
    element.style.setProperty('--y', `${event.clientY - rect.top}px`);
  };

  return { onPointerMove };
}

// a soft light that follows the pointer across a card
export const spotlightSx = (theme: Theme) => ({
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background: `radial-gradient(420px circle at var(--x, 50%) var(--y, 0%), ${primaryTint(theme, 0.13)}, transparent 45%)`,
    opacity: 0,
    transition: 'opacity 300ms ease-out',
  },
  '&:hover::before': { opacity: 1 },
  '&:hover': { borderColor: primaryTint(theme, 0.55) },
});
