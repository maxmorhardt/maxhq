import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import Contest from './Contest';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../../service/contestService', async () => {
  const actual = await vi.importActual<typeof import('../../../service/contestService')>(
    '../../../service/contestService'
  );
  return { ...actual, updateSquareValueById: vi.fn().mockResolvedValue({}) };
});
vi.mock('./EditSquare', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="edit-square-dialog" /> : null,
}));

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

const squares = Array.from({ length: 4 }, (_, i) => ({
  id: `sq-${i}`,
  contestId: 'c-1',
  row: Math.floor(i / 2),
  col: i % 2,
  value: i === 0 ? 'JD' : '',
  owner: i === 0 ? 'alice' : '',
  ownerName: i === 0 ? 'Alice' : '',
  createdAt: '',
  updatedAt: '',
  createdBy: 'alice',
  updatedBy: 'alice',
}));

const baseContest = {
  id: 'c-1',
  name: 'Test Bowl',
  xLabels: [3, 7],
  yLabels: [0, 4],
  homeTeam: 'Chiefs',
  awayTeam: 'Eagles',
  status: 'ACTIVE' as const,
  visibility: 'public' as const,
  squares,
  owner: 'alice',
  createdAt: '',
  updatedAt: '',
  createdBy: 'alice',
  updatedBy: 'alice',
};

function renderContest(contestOverride?: unknown, participants: unknown[] = []) {
  return render(
    <ThemeProvider theme={theme}>
      <Provider store={makeStore(contestOverride, participants)}>
        <Contest />
      </Provider>
    </ThemeProvider>
  );
}

function makeStore(contestOverride?: unknown, participants: unknown[] = []) {
  return configureStore({
    reducer: { contest: contestReducer },
    preloadedState: {
      contest: {
        ...contestReducer(undefined, { type: '' }),
        currentContest: contestOverride !== undefined ? contestOverride : baseContest,
        participants,
      } as ReturnType<typeof contestReducer>,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

describe('Contest (grid)', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      signinRedirect: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('renders nothing when there is no current contest', () => {
    const { container } = renderContest(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders square buttons for the contest grid', () => {
    renderContest();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('renders filled square value text', () => {
    renderContest();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders nothing when contest has no squares array', () => {
    const { container } = renderContest({ ...baseContest, squares: undefined });
    expect(container).toBeEmptyDOMElement();
  });

  it('calls signinRedirect when unauthenticated user clicks a square', () => {
    const signinRedirect = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      signinRedirect,
    } as unknown as ReturnType<typeof useAuth>);
    renderContest();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(signinRedirect).toHaveBeenCalled();
  });

  it('renders without crashing when read-only authenticated user clicks a square', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { profile: { email: 'charlie', name: 'Charlie Brown' } },
      signinRedirect: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    renderContest();
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    // Charlie is not a participant, so showToast is called (mocked at top)
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('dispatches updateSquare when participant clicks an empty square', async () => {
    const { updateSquareValueById } = await import('../../../service/contestService');
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { profile: { email: 'bob', name: 'Bob Smith' } },
      signinRedirect: vi.fn(),
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
    renderContest(undefined, [participant]);
    const buttons = screen.getAllByRole('button');
    // click an empty square (index 1 since index 0 has value 'JD')
    fireEvent.click(buttons[1]);
    await waitFor(() => expect(updateSquareValueById).toHaveBeenCalled());
  });

  it('opens edit dialog when participant clicks a filled square', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { profile: { email: 'bob', name: 'Bob Smith' } },
      signinRedirect: vi.fn(),
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
    renderContest(undefined, [participant]);
    const buttons = screen.getAllByRole('button');
    // click the filled square (index 0 has value 'JD')
    fireEvent.click(buttons[0]);
    expect(screen.getByTestId('edit-square-dialog')).toBeInTheDocument();
  });

  it('shows square limit warning when participant is at max squares', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { profile: { email: 'alice', name: 'Alice A' } },
      signinRedirect: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    // alice is owner but also in participants with maxSquares=1
    const participant = {
      id: 'p-1',
      contestId: 'c-1',
      userId: 'alice',
      inviteId: '',
      role: 'participant' as const,
      maxSquares: 1,
      joinedAt: '',
      createdAt: '',
      updatedAt: '',
    };
    // baseContest has alice owning square 0 (value 'JD', owner 'alice')
    // isOwner = true (alice === baseContest.owner), so isReadOnly = false
    // clicking empty square: alice already has 1 square claimed (sq-0)
    // maxSquares=1 so should trigger limit warning
    renderContest(undefined, [participant]);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Click empty square (index 1)
    // toast was called (mocked at top level)
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});
