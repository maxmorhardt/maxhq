import { describe, expect, it } from 'vitest';
import { plural } from './plural';

describe('plural', () => {
  it('adds an s to anything but one', () => {
    expect([plural(0, 'square'), plural(1, 'square'), plural(2, 'player')]).toEqual([
      '0 squares',
      '1 square',
      '2 players',
    ]);
  });
});
