import type { Contest } from '../types/contest';

// same rule the server scores with: away digit picks the row, home digit the column
export function squareFor(contest: Contest, home: number, away: number) {
  const row = contest.yLabels.indexOf(away % 10);
  const col = contest.xLabels.indexOf(home % 10);
  if (row === -1 || col === -1) {
    return null;
  }
  return { row, col, square: contest.squares?.find((s) => s.row === row && s.col === col) };
}
