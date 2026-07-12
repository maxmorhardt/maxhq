import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import ContestsTable from './ContestsTable';
import type { Contest } from '../../../types/contest';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('./DeleteContest', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="delete-dialog" /> : null),
}));
vi.mock('./EditContest', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="edit-dialog" /> : null),
}));

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

const contest: Contest = {
  id: 'c-1',
  name: 'Super Bowl LX',
  xLabels: [],
  yLabels: [],
  status: 'ACTIVE',
  visibility: 'public',
  squares: [],
  owner: 'alice',
  homeTeam: 'Chiefs',
  awayTeam: 'Eagles',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  createdBy: 'alice',
  updatedBy: 'alice',
};

function makeStore() {
  return configureStore({
    reducer: { contest: contestReducer },
    preloadedState: {
      contest: { ...contestReducer(undefined, { type: '' }), currentContest: null },
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

const defaultProps = {
  contests: [contest],
  totalCount: 1,
  page: 0,
  rowsPerPage: 5,
  onPageChange: vi.fn(),
  onRowsPerPageChange: vi.fn(),
  hidePagination: false,
  title: 'My Contests',
};

function renderTable(props = defaultProps) {
  return render(
    <ThemeProvider theme={theme}>
      <Provider store={makeStore()}>
        <MemoryRouter>
          <ContestsTable {...props} />
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

  it('renders the table title', () => {
    renderTable();
    expect(screen.getByText('My Contests')).toBeInTheDocument();
  });

  it('shows "No contests yet" when contests list is empty', () => {
    renderTable({ ...defaultProps, contests: [], totalCount: 0 });
    expect(screen.getByText('No contests yet')).toBeInTheDocument();
  });

  it('renders contest rows', () => {
    renderTable();
    expect(screen.getByText('Super Bowl LX')).toBeInTheDocument();
  });

  it('opens the delete dialog when the delete icon is clicked', () => {
    renderTable();
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
  });

  it('opens the edit dialog when the edit icon is clicked', () => {
    renderTable();
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);
    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
  });

  it('navigates to contest detail when row is clicked', () => {
    renderTable();
    fireEvent.click(screen.getByText('Super Bowl LX'));
    expect(mockNavigate).toHaveBeenCalledWith('/contests/c-1');
  });

  it('does not show edit/delete buttons when user is not the owner', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { profile: { email: 'bob' } },
    } as unknown as ReturnType<typeof useAuth>);
    renderTable();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('shows the leave icon for a non-owned active contest when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { profile: { email: 'bob' } },
    } as unknown as ReturnType<typeof useAuth>);
    renderTable({ ...defaultProps, onLeave: vi.fn() });
    expect(screen.getAllByRole('button', { name: /leave contest/i }).length).toBeGreaterThan(0);
  });

  it('does not show the leave icon when the user email is unavailable', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      user: undefined,
    } as unknown as ReturnType<typeof useAuth>);
    renderTable({ ...defaultProps, onLeave: vi.fn() });
    expect(screen.queryByRole('button', { name: /leave contest/i })).not.toBeInTheDocument();
  });

  it('shows pagination when hidePagination is false (default)', () => {
    renderTable();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('hides pagination when hidePagination is true', () => {
    renderTable({ ...defaultProps, hidePagination: true });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows contest name and matchup when homeTeam and awayTeam are set', () => {
    renderTable();
    expect(screen.getByText('Chiefs vs Eagles')).toBeInTheDocument();
  });

  it('shows only homeTeam when awayTeam is absent', () => {
    renderTable({ ...defaultProps, contests: [{ ...contest, awayTeam: undefined }] });
    expect(screen.getByText('Chiefs')).toBeInTheDocument();
  });

  it('shows dash when both homeTeam and awayTeam are absent', () => {
    renderTable({
      ...defaultProps,
      contests: [{ ...contest, homeTeam: undefined, awayTeam: undefined }],
    });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows custom title when title prop is provided', () => {
    renderTable({ ...defaultProps, title: 'Joined Contests' });
    expect(screen.getByText('Joined Contests')).toBeInTheDocument();
  });
});
