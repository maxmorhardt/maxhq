import { describe, expect, it } from 'vitest';
import type { Contest, Square } from '../types/contest';
import { squareFor } from './squareFor';

const square = (row: number, col: number, owner = ''): Square => ({
  id: `${row}-${col}`,
  contestId: 'c',
  row,
  col,
  value: owner ? 'AB' : '',
  owner,
  ownerName: owner,
  version: 1,
  createdAt: '',
  updatedAt: '',
  createdBy: '',
  updatedBy: '',
});

const contest = {
  xLabels: [3, 1, 4, 0, 5, 9, 2, 6, 8, 7],
  yLabels: [7, 0, 2, 8, 1, 4, 9, 6, 3, 5],
  squares: [square(0, 4, 'max')],
} as unknown as Contest;

describe('squareFor', () => {
  it('maps the away digit to a row and the home digit to a column', () => {
    expect(squareFor(contest, 24, 17)).toEqual({ row: 0, col: 2, square: undefined });
    expect(squareFor(contest, 35, 27)?.square?.owner).toBe('max');
  });

  it('returns null while the numbers are hidden', () => {
    const hidden = {
      ...contest,
      xLabels: Array(10).fill(-1),
      yLabels: Array(10).fill(-1),
    } as Contest;
    expect(squareFor(hidden, 7, 3)).toBeNull();
  });
});
