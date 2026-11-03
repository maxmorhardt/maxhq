import { describe, expect, it } from 'vitest';
import { optionSx } from './optionSx';

describe('optionSx', () => {
  it('outlines a selected card in the brand color', () => {
    expect(optionSx(true).borderColor).toBe('primary.main');
    expect(optionSx(false).borderColor).toBe('divider');
  });

  it('fades a blocked card and keeps its hover quiet', () => {
    const blocked = optionSx(false, true);
    expect(blocked.opacity).toBe(0.5);
    expect(blocked['&:hover'].borderColor).toBe('divider');
    expect(optionSx(false).opacity).toBe(1);
  });
});
