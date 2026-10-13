import { configureStore } from '@reduxjs/toolkit';
import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { useAuth } from 'react-oidc-context';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contestReducer } from '../../../features/contests/contestSlice';
import type { Contest } from '../../../types/contest';
import WhatIfScoreboard from './WhatIfScoreboard';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const contest = {
  id: 'c-1',
  name: 'Test Bowl',
  xLabels: digits,
  yLabels: digits,
  status: 'Q2',
  visibility: 'public',
  version: 1,
  owner: 'alice',
  homeTeam: 'Chiefs',
  awayTeam: 'Eagles',
  squares: [
    { id: 's1', row: 3, col: 7, owner: 'alice', ownerName: 'Alice', value: 'AL' },
    { id: 's2', row: 0, col: 0, owner: 'bob', ownerName: 'Bob', value: 'BO' },
  ],
  game: { homeScore: 7, awayScore: 3 },
} as unknown as Contest;

function renderBoard(current: Contest | null = contest) {
  const store = configureStore({
    reducer: { contest: contestReducer },
    preloadedState: {
      contest: { ...contestReducer(undefined, { type: '' }), currentContest: current },
    },
    middleware: (m) => m({ serializableCheck: false }),
  });
  return render(
    <ThemeProvider theme={createTheme()}>
      <Provider store={store}>
        <WhatIfScoreboard />
      </Provider>
    </ThemeProvider>
  );
}

describe('WhatIfScoreboard', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { profile: { email: 'alice' } },
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('starts from the live score and celebrates your own square', () => {
    renderBoard();
    expect(screen.getByText("That's your square at 7–3!")).toBeInTheDocument();
  });

  it('moves to whoever holds the new digits', () => {
    renderBoard();
    fireEvent.click(screen.getByRole('button', { name: 'Chiefs TD' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eagles TD' }));
    expect(screen.getByText('Nobody has that square at 14–10')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Chiefs Safety' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chiefs XP' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chiefs FG' }));
    expect(screen.getByText('Bob wins at 20–10')).toBeInTheDocument();
  });

  it('resets to the real score', () => {
    renderBoard();
    fireEvent.click(screen.getByRole('button', { name: 'Eagles FG' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset scores' }));
    expect(screen.getByText("That's your square at 7–3!")).toBeInTheDocument();
  });

  it('waits for the numbers before naming a square', () => {
    renderBoard({
      ...contest,
      xLabels: Array(10).fill(-1),
      yLabels: Array(10).fill(-1),
      game: undefined,
    });
    expect(screen.getByText('Numbers are drawn when the grid locks')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  it('renders nothing without a contest', () => {
    const { container } = renderBoard(null);
    expect(container).toBeEmptyDOMElement();
  });
});
