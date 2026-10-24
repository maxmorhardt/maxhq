import { describe, expect, it } from 'vitest';
import { formatCount } from './formatCount';

describe('formatCount', () => {
  it('leaves counts under a thousand alone', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
  });

  it('compacts thousands, millions, and billions', () => {
    expect(formatCount(1000)).toBe('1K');
    expect(formatCount(4812)).toBe('4.8K');
    expect(formatCount(48201733)).toBe('48.2M');
    expect(formatCount(98402551203)).toBe('98.4B');
  });

  it('rounds up into the next unit', () => {
    expect(formatCount(999950)).toBe('1M');
  });
});
