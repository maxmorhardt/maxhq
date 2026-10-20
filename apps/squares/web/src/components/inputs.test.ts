import type { KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { blockNonIntegerKeys } from './inputs';

const press = (key: string) => {
  const event = { key, preventDefault: vi.fn() } as unknown as KeyboardEvent;
  blockNonIntegerKeys(event);
  return event.preventDefault;
};

describe('blockNonIntegerKeys', () => {
  it('blocks exponents, signs, and decimals', () => {
    ['e', 'E', '+', '-', '.'].forEach((key) => expect(press(key)).toHaveBeenCalled());
  });

  it('lets digits and editing keys through', () => {
    ['1', 'Backspace', 'ArrowLeft'].forEach((key) => expect(press(key)).not.toHaveBeenCalled());
  });
});
