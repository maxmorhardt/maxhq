import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { makeStore } from '../../../../app/store';
import ContestsTable from './ContestsTable';
import type { ContestSummary } from '../../../../types/contest';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('./DeleteContestDialog', () => ({
  default: ({ contest }: { contest: ContestSummary | null }) =>
    contest ? <div data-testid="delete-dialog">{contest.name}</div> : null,
}));
vi.mock('./EditContestDialog', () => ({
  default: ({ contest }: { contest: ContestSummary | null }) =>
    contest ? <div data-testid="edit-dialog">{contest.name}</div> : null,
}));
vi.mock('../LeaveContestDialog', () => ({
  default: ({ contest }: { contest: ContestSummary | null }) =>
    contest ? <div data-testid="leave-dialog">{contest.name}</div> : null,
}));

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

const contest: ContestSummary = {
  version: 1,
  id: 'c-1',
  name: 'Super Bowl LX',
  status: 'ACTIVE',
  visibility: 'public',
  owner: 'alice',
  role: 'owner',
  homeTeam: 'Chiefs',
  awayTeam: 'Eagles',
  claimedSquares: 42,
  mySquares: 0,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const joined: ContestSummary = {
  ...contest,
  id: 'c-2',
  name: 'Office Pool',
  role: 'participant',
  mySquares: 5,
};

function renderTable(props: Partial<ComponentProps<typeof ContestsTable>> = {}) {
  const store = makeStore();
  return render(
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <MemoryRouter>
          <ContestsTable contests={[contest]} {...props} />
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

describe('ContestsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { profile: { email: 'alice' } },
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('shows the empty state', () => {
    renderTable({ contests: [] });
    expect(screen.getByText('No contests yet')).toBeInTheDocument();
  });

  it('shows a custom empty title', () => {
    renderTable({ contests: [], emptyTitle: 'No contests match these filters' });
    expect(screen.getByText('No contests match these filters')).toBeInTheDocument();
  });

  it('renders owned and joined contests together with their role', () => {
    renderTable({ contests: [contest, joined] });
    expect(screen.getByText('Super Bowl LX')).toBeInTheDocument();
    expect(screen.getByText('Office Pool')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();
  });

  it('shows claimed squares and the caller’s own count', () => {
    renderTable({ contests: [contest, joined] });
    expect(screen.getByText('42/100')).toBeInTheDocument();
    expect(screen.getByText('42/100 · 5 yours')).toBeInTheDocument();
  });

  it('shows the matchup, one team, or a dash', () => {
    renderTable({
      contests: [
        contest,
        { ...joined, awayTeam: undefined },
        { ...joined, id: 'c-3', homeTeam: undefined, awayTeam: undefined },
      ],
    });
    expect(screen.getByText('Eagles @ Chiefs')).toBeInTheDocument();
    expect(screen.getByText('Chiefs')).toBeInTheDocument();
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('opens the edit and delete dialogs with the clicked contest', () => {
    renderTable();
    fireEvent.click(screen.getByRole('button', { name: /edit contest/i }));
    expect(screen.getByTestId('edit-dialog')).toHaveTextContent('Super Bowl LX');
    fireEvent.click(screen.getByRole('button', { name: /delete contest/i }));
    expect(screen.getByTestId('delete-dialog')).toHaveTextContent('Super Bowl LX');
  });

  it('navigates to the contest when a row is clicked', () => {
    renderTable();
    fireEvent.click(screen.getByText('Super Bowl LX'));
    expect(mockNavigate).toHaveBeenCalledWith('/contests/c-1');
  });

  it('only offers view and leave on joined contests', () => {
    renderTable({ contests: [joined] });
    expect(screen.getByRole('button', { name: /view contest/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit contest/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /leave contest/i }));
    expect(screen.getByTestId('leave-dialog')).toHaveTextContent('Office Pool');
  });

  it('hides leave without a signed-in email', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      user: undefined,
    } as unknown as ReturnType<typeof useAuth>);
    renderTable({ contests: [joined] });
    expect(screen.queryByRole('button', { name: /leave contest/i })).not.toBeInTheDocument();
  });

  it('only offers view on a finished contest the user owns', () => {
    renderTable({ contests: [{ ...contest, status: 'FINISHED' }] });
    fireEvent.click(screen.getByRole('button', { name: /view contest/i }));
    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete contest/i })).not.toBeInTheDocument();
  });

  it('renders the footer', () => {
    renderTable({ footer: <div data-testid="footer" /> });
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('shows the kickoff of a contest that has not started', () => {
    renderTable({ contests: [{ ...contest, status: 'ACTIVE', gameTime: '2026-11-01T18:00:00Z' }] });
    expect(screen.getByText(/Eagles @ Chiefs · /)).toBeInTheDocument();
  });

  it('opens a contest from the keyboard', () => {
    renderTable({ contests: [contest] });
    fireEvent.keyDown(screen.getByRole('listitem', { name: 'Super Bowl LX' }), { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/contests/c-1');
  });
});
