import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import WinnersBoard from './WinnersBoard';
import type { QuarterResult } from '../../../types/contest';

const theme = createTheme();

function renderBoard(quarterResults?: QuarterResult[]) {
  return render(
    <ThemeProvider theme={theme}>
      <WinnersBoard quarterResults={quarterResults} />
    </ThemeProvider>
  );
}

const results: QuarterResult[] = [
  {
    id: 'qr-1',
    contestId: 'c-1',
    quarter: 1,
    homeTeamScore: 7,
    awayTeamScore: 3,
    winnerRow: 3,
    winnerCol: 7,
    winner: 'alice',
    winnerName: 'Alice Smith',
    createdAt: '',
    updatedAt: '',
    createdBy: 'alice',
    updatedBy: 'alice',
  },
];

describe('WinnersBoard', () => {
  it('renders the "Winners Board" heading', () => {
    renderBoard();
    expect(screen.getByText('Winners Board')).toBeInTheDocument();
  });

  it('shows "No winners yet" when there are no results', () => {
    renderBoard([]);
    expect(screen.getByText('No winners yet')).toBeInTheDocument();
  });

  it('renders quarter result rows', () => {
    renderBoard(results);
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });
});
