import { configureStore } from '@reduxjs/toolkit';
import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { useAuth } from 'react-oidc-context';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contestReducer } from '../../../features/contests/contestSlice';
import type { ContestStatus, QuarterResult } from '../../../types/contest';
import WinnersBoard from './WinnersBoard';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../../service/contestService', async () => {
  const actual = await vi.importActual<typeof import('../../../service/contestService')>(
    '../../../service/contestService'
  );
  return { ...actual, rollbackQuarterResult: vi.fn().mockResolvedValue({ quarter: 1 }) };
});

const theme = createTheme();

const baseContest = {
  id: 'c-1',
  name: 'Test Bowl',
  xLabels: [],
  yLabels: [],
  status: 'Q2' as ContestStatus,
  visibility: 'public' as const,
  squares: [],
  owner: 'alice',
  homeTeam: 'Chiefs',
  awayTeam: 'Eagles',
  createdAt: '',
  updatedAt: '',
  createdBy: 'alice',
  updatedBy: 'alice',
};

type ContestOverrides = Partial<typeof baseContest> & { gameId?: string };

function setAuth(email?: string) {
  vi.mocked(useAuth).mockReturnValue({
    user: email ? { profile: { email } } : undefined,
    isAuthenticated: !!email,
  } as unknown as ReturnType<typeof useAuth>);
}

function makeStore(contest: (typeof baseContest & ContestOverrides) | null) {
  return configureStore({
    reducer: { contest: contestReducer },
    preloadedState: {
      contest: { ...contestReducer(undefined, { type: '' }), currentContest: contest },
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

function renderBoard(quarterResults?: QuarterResult[], overrides: ContestOverrides = {}) {
  const store = makeStore({ ...baseContest, ...overrides });
  return render(
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <WinnersBoard quarterResults={quarterResults} />
      </Provider>
    </ThemeProvider>
  );
}

function makeResult(quarter: number, overrides: Partial<QuarterResult> = {}): QuarterResult {
  return {
    id: `qr-${quarter}`,
    contestId: 'c-1',
    quarter,
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
    ...overrides,
  };
}

const results = [makeResult(1)];

describe('WinnersBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // default to a non-owner viewer so the rollback control stays hidden
    setAuth('bob');
  });

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

  it('labels a ghosted winner as "ghost" instead of a blank name', () => {
    renderBoard([makeResult(1, { winner: 'ghost', winnerName: '' })]);
    expect(screen.getByText('ghost')).toBeInTheDocument();
  });

  it('shows the rollback control on the latest winner for the owner of a manual contest', () => {
    setAuth('alice');
    renderBoard([makeResult(1), makeResult(2)], { status: 'Q3' });

    // only the latest quarter is rollback-able
    expect(screen.getByRole('button', { name: /roll back q2 result/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /roll back q1 result/i })).not.toBeInTheDocument();
  });

  it('hides the rollback control from non-owners', () => {
    setAuth('bob');
    renderBoard(results);
    expect(screen.queryByRole('button', { name: /roll back/i })).not.toBeInTheDocument();
  });

  it('hides the rollback control for game-linked contests', () => {
    setAuth('alice');
    renderBoard(results, { gameId: 'game-1' });
    expect(screen.queryByRole('button', { name: /roll back/i })).not.toBeInTheDocument();
  });

  it('confirms and dispatches the rollback', async () => {
    const { rollbackQuarterResult } = await import('../../../service/contestService');
    setAuth('alice');
    renderBoard(results);

    fireEvent.click(screen.getByRole('button', { name: /roll back q1 result/i }));
    fireEvent.click(screen.getByRole('button', { name: /^roll back$/i }));

    await waitFor(() => expect(rollbackQuarterResult).toHaveBeenCalledWith('c-1'));
  });
});
