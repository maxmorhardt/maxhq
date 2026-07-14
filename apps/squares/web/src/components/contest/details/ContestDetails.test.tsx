import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import ContestDetails from './ContestDetails';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('./ActiveContestControls', () => ({
  default: () => <div data-testid="active-controls" />,
}));
vi.mock('./ContestActionIcons', () => ({ default: () => <div data-testid="action-icons" /> }));
vi.mock('./ScoreUpdateControls', () => ({ default: () => <div data-testid="score-controls" /> }));
vi.mock('./StartGameButton', () => ({ default: () => <div data-testid="start-button" /> }));

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

const baseContest = {
  id: 'c-1',
  name: 'Test Bowl',
  xLabels: [0, 1, 2],
  yLabels: [0, 1, 2],
  status: 'ACTIVE' as const,
  visibility: 'public' as const,
  squares: Array.from({ length: 9 }, (_, i) => ({
    id: `sq-${i}`,
    contestId: 'c-1',
    row: Math.floor(i / 3),
    col: i % 3,
    value: '',
    owner: '',
    ownerName: '',
    createdAt: '',
    updatedAt: '',
    createdBy: 'alice',
    updatedBy: 'alice',
  })),
  owner: 'alice',
  createdAt: '',
  updatedAt: '',
  createdBy: 'alice',
  updatedBy: 'alice',
};

function makeStore(override: Partial<ReturnType<typeof contestReducer>> = {}) {
  return configureStore({
    reducer: { contest: contestReducer },
    preloadedState: {
      contest: { ...contestReducer(undefined, { type: '' }), ...override } as ReturnType<
        typeof contestReducer
      >,
    },
  });
}

function renderDetails(
  storeOverride: Record<string, unknown> = {},
  props: { isOwner?: boolean } = {}
) {
  return render(
    <ThemeProvider theme={theme}>
      <Provider store={makeStore(storeOverride)}>
        <ContestDetails {...props} />
      </Provider>
    </ThemeProvider>
  );
}

describe('ContestDetails', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('renders nothing when there is no current contest', () => {
    const { container } = renderDetails({ currentContest: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders "Contest Details" heading', () => {
    renderDetails({ currentContest: baseContest });
    expect(screen.getByText('Contest Details')).toBeInTheDocument();
  });

  it('shows "Active" status for an ACTIVE contest', () => {
    renderDetails({ currentContest: baseContest });
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows "Deleted" status for a DELETED contest', () => {
    renderDetails({ currentContest: { ...baseContest, status: 'DELETED' } });
    expect(screen.getByText('Deleted')).toBeInTheDocument();
  });

  it('shows "Finished" status for a FINISHED contest', () => {
    renderDetails({ currentContest: { ...baseContest, status: 'FINISHED' } });
    expect(screen.getByText('Finished')).toBeInTheDocument();
  });

  it('shows "In Progress • Q1" status for Q1 contest', () => {
    renderDetails({ currentContest: { ...baseContest, status: 'Q1' } });
    expect(screen.getByText('In Progress • Q1')).toBeInTheDocument();
  });

  it('shows squares filled progress when ACTIVE', () => {
    renderDetails({ currentContest: baseContest });
    expect(screen.getByText(/0\/9 squares filled/)).toBeInTheDocument();
  });

  it('shows authenticated participant square count', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { profile: { email: 'alice' } },
    } as unknown as ReturnType<typeof useAuth>);
    const participant = {
      id: 'p-1',
      contestId: 'c-1',
      userId: 'alice',
      inviteId: '',
      role: 'participant' as const,
      maxSquares: 5,
      joinedAt: '',
      createdAt: '',
      updatedAt: '',
    };
    renderDetails({ currentContest: baseContest, participants: [participant] });
    expect(screen.getByText(/0\/5/)).toBeInTheDocument();
  });

  it('shows Random Square button when participant has not reached limit', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { profile: { email: 'bob' } },
    } as unknown as ReturnType<typeof useAuth>);
    const participant = {
      id: 'p-1',
      contestId: 'c-1',
      userId: 'bob',
      inviteId: '',
      role: 'participant' as const,
      maxSquares: 10,
      joinedAt: '',
      createdAt: '',
      updatedAt: '',
    };
    renderDetails({ currentContest: baseContest, participants: [participant] });
    expect(screen.getByRole('button', { name: /randomly select square/i })).toBeInTheDocument();
  });

  it('shows "Deleted" status text and no actions for DELETED owner contest', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { profile: { email: 'alice' } },
    } as unknown as ReturnType<typeof useAuth>);
    const ownerParticipant = {
      id: 'p-1',
      contestId: 'c-1',
      userId: 'alice',
      inviteId: '',
      role: 'owner' as const,
      maxSquares: 100,
      joinedAt: '',
      createdAt: '',
      updatedAt: '',
    };
    renderDetails({
      currentContest: { ...baseContest, status: 'DELETED', owner: 'alice' },
      participants: [ownerParticipant],
    });
    expect(screen.getByText('Deleted')).toBeInTheDocument();
  });

  it('shows viewer notice for authenticated non-participant public contest', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { profile: { email: 'carol' } },
    } as unknown as ReturnType<typeof useAuth>);
    renderDetails({ currentContest: { ...baseContest, visibility: 'public', owner: 'alice' } });
    expect(screen.getByText(/you're viewing this contest/i)).toBeInTheDocument();
  });

  const filledContest = {
    ...baseContest,
    squares: baseContest.squares.map((s) => ({ ...s, value: 'X' })),
  };

  it('shows the start button for a full manual contest', () => {
    renderDetails({ currentContest: filledContest }, { isOwner: true });
    expect(screen.getByTestId('start-button')).toBeInTheDocument();
  });

  it('shows the auto-start notice instead of the start button for a full game-linked contest', () => {
    renderDetails({ currentContest: { ...filledContest, gameId: 'g-1' } }, { isOwner: true });
    expect(
      screen.getByText(/starts automatically when the linked game kicks off/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId('start-button')).not.toBeInTheDocument();
  });

  it('shows auto-scoring notice with the matchup for an in-progress game-linked contest', () => {
    renderDetails(
      {
        currentContest: {
          ...baseContest,
          status: 'Q1',
          gameId: 'g-1',
          game: { awayTeam: 'Jets', homeTeam: 'Bills' },
        },
      },
      { isOwner: true }
    );
    expect(
      screen.getByText(/scores update automatically from the linked game/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Jets @ Bills/)).toBeInTheDocument();
    expect(screen.queryByTestId('score-controls')).not.toBeInTheDocument();
  });

  it('shows auto-scoring notice without a matchup when the game is not loaded', () => {
    renderDetails(
      { currentContest: { ...baseContest, status: 'Q1', gameId: 'g-1' } },
      {
        isOwner: true,
      }
    );
    expect(
      screen.getByText(/scores update automatically from the linked game/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });
});
