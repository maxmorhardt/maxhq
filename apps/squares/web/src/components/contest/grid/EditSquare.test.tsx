import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import { userReducer } from '../../../features/user/userSlice';
import type { UserProfile } from '../../../types/user';
import EditSquare from './EditSquare';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../../service/contestService', async () => {
  const actual = await vi.importActual<typeof import('../../../service/contestService')>(
    '../../../service/contestService'
  );
  return {
    ...actual,
    claimSquareById: vi.fn().mockResolvedValue({}),
    clearSquareById: vi.fn().mockResolvedValue({}),
  };
});

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

const baseContest = {
  id: 'c-1',
  name: 'Test Bowl',
  xLabels: [],
  yLabels: [],
  status: 'ACTIVE' as const,
  visibility: 'public' as const,
  squares: [],
  owner: 'alice',
  createdAt: '',
  updatedAt: '',
  createdBy: 'alice',
  updatedBy: 'alice',
};

const currentSquare = {
  id: 'sq-1',
  contestId: 'c-1',
  row: 0,
  col: 0,
  value: '',
  owner: '',
  ownerName: '',
  createdAt: '',
  updatedAt: '',
  createdBy: 'alice',
  updatedBy: 'alice',
};

const baseProfile: UserProfile = {
  email: 'alice',
  displayName: 'Alice Smith',
  defaultInitials: 'AS',
  createdAt: '',
};

function makeStore(squareOverride?: unknown, profile: UserProfile | null = baseProfile) {
  return configureStore({
    reducer: { contest: contestReducer, user: userReducer },
    preloadedState: {
      contest: {
        ...contestReducer(undefined, { type: '' }),
        currentContest: baseContest,
        currentSquare: squareOverride !== undefined ? squareOverride : currentSquare,
      } as ReturnType<typeof contestReducer>,
      user: {
        ...userReducer(undefined, { type: '' }),
        profile,
      } as ReturnType<typeof userReducer>,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

function renderDialog(squareOverride?: unknown, profile: UserProfile | null = baseProfile) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Provider store={makeStore(squareOverride, profile)}>
          <EditSquare open={true} onClose={vi.fn()} />
        </Provider>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('EditSquare', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        profile: {
          name: 'Alice Smith',
          email: 'alice',
        },
      },
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('renders nothing when currentSquare is null', () => {
    const { container } = renderDialog(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an unclaimed details dialog for an empty square with no claim action', () => {
    renderDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Empty Square')).toBeInTheDocument();
    expect(screen.getByText(/this square is unclaimed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /claim square/i })).not.toBeInTheDocument();
  });

  it('shows the owning viewer their initials and a clear action', () => {
    const ownedSquare = { ...currentSquare, value: 'AS', owner: 'alice', ownerName: 'Alice Smith' };
    renderDialog(ownedSquare);
    expect(screen.getByText('Your Square')).toBeInTheDocument();
    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear square/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /change your default initials/i })).toHaveAttribute(
      'href',
      '/profile'
    );
  });

  it('shows details and no clear action when owned by another user', () => {
    const filledSquare = { ...currentSquare, value: 'JD', owner: 'bob', ownerName: 'Bob Jones' };
    renderDialog(filledSquare);
    expect(screen.getByText('Square Details')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear square/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Claimed by Bob Jones/)).toBeInTheDocument();
  });

  it('calls clearSquareById when Clear Square button is clicked', async () => {
    const { clearSquareById } = await import('../../../service/contestService');
    const ownedSquare = { ...currentSquare, value: 'AS', owner: 'alice', ownerName: 'Alice' };
    renderDialog(ownedSquare);
    fireEvent.click(screen.getByRole('button', { name: /clear square/i }));
    await waitFor(() => expect(clearSquareById).toHaveBeenCalled());
  });

  it('shows winner badge when square has quarter results', () => {
    const contestWithWinner = {
      ...baseContest,
      quarterResults: [
        {
          id: 'qr-1',
          contestId: 'c-1',
          quarter: 1,
          homeTeamScore: 14,
          awayTeamScore: 7,
          winnerRow: 0,
          winnerCol: 0,
          winner: 'alice',
          winnerName: 'Alice',
          createdAt: '',
          updatedAt: '',
          createdBy: 'alice',
          updatedBy: 'alice',
        },
      ],
    };
    const store = configureStore({
      reducer: { contest: contestReducer, user: userReducer },
      preloadedState: {
        contest: {
          ...contestReducer(undefined, { type: '' }),
          currentContest: contestWithWinner,
          currentSquare,
        } as ReturnType<typeof contestReducer>,
        user: {
          ...userReducer(undefined, { type: '' }),
          profile: baseProfile,
        } as ReturnType<typeof userReducer>,
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    });
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <Provider store={store}>
            <EditSquare open={true} onClose={vi.fn()} />
          </Provider>
        </MemoryRouter>
      </ThemeProvider>
    );
    expect(screen.getByText(/Winner · Q1/)).toBeInTheDocument();
  });
});
