import type { KeyboardEvent } from 'react';

// the browser's number spinners are too small to tap and fight the custom steppers
export const noNumberSpinners = {
  '& input[type=number]': { MozAppearance: 'textfield' },
  '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
  '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
} as const;

const NON_INTEGER_KEYS = new Set(['e', 'E', '+', '-', '.']);

// number inputs accept exponents and signs, which no count or score here allows
export function blockNonIntegerKeys(event: KeyboardEvent) {
  if (NON_INTEGER_KEYS.has(event.key)) {
    event.preventDefault();
  }
}
