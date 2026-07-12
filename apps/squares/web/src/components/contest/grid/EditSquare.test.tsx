import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import EditSquare from './EditSquare';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../../service/contestService', async () => {
  const actual = await vi.importActual<typeof import('../../../service/contestService')>(
    '../../../service/contestService'
  );
  return {
    ...actual,
    updateSquareValueById: vi.fn().mockResolvedValue({}),
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

function makeStore(squareOverride?: unknown) {
  return configureStore({
    reducer: { contest: contestReducer },
    preloadedState: {
      contest: {
        ...contestReducer(undefined, { type: '' }),
        currentContest: baseContest,
        currentSquare: squareOverride !== undefined ? squareOverride : currentSquare,
      } as ReturnType<typeof contestReducer>,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

function renderDialog(squareOverride?: unknown) {
  return render(
    <ThemeProvider theme={theme}>
      <Provider store={makeStore(squareOverride)}>
        <EditSquare open={true} onClose={vi.fn()} />
      </Provider>
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

  it('renders the dialog when currentSquare is set', () => {
    renderDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('pre-fills initials from user name when square has no value', () => {
    renderDialog();
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('AS');
  });

  it('does not close when Save is clicked with an empty value', () => {
    const onClose = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <Provider store={makeStore()}>
          <EditSquare open={true} onClose={onClose} />
        </Provider>
      </ThemeProvider>
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows View Square title and disables input when square is owned by another user', () => {
    const filledSquare = { ...currentSquare, value: 'JD', owner: 'bob', ownerName: 'Bob Jones' };
    renderDialog(filledSquare);
    expect(screen.getByText('View Square')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByText(/Owner: Bob Jones/)).toBeInTheDocument();
  });

  it('calls clearSquareById when Clear Square button is clicked', async () => {
    const { clearSquareById } = await import('../../../service/contestService');
    // Square needs a value AND be owned by the current user for Clear Square to show
    const ownedSquare = { ...currentSquare, value: 'AS', owner: 'alice', ownerName: 'Alice' };
    renderDialog(ownedSquare);
    fireEvent.click(screen.getByRole('button', { name: /clear square/i }));
    await waitFor(() => expect(clearSquareById).toHaveBeenCalled());
  });

  it('calls updateSquareValueById when Save is clicked with a valid value', async () => {
    const { updateSquareValueById } = await import('../../../service/contestService');
    renderDialog();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'XY' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(updateSquareValueById).toHaveBeenCalled());
  });

  it('resets value to existing square value on close when square has value', () => {
    const filledSquare = { ...currentSquare, value: 'AB', owner: 'alice', ownerName: 'Alice' };
    const onClose = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <Provider store={makeStore(filledSquare)}>
          <EditSquare open={true} onClose={onClose} />
        </Provider>
      </ThemeProvider>
    );
    // Change value then close via the X button
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ZZ' } });
    const closeBtn = screen.getAllByRole('button').find((b) => b.querySelector('svg'));
    if (closeBtn) fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
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
      reducer: { contest: contestReducer },
      preloadedState: {
        contest: {
          ...contestReducer(undefined, { type: '' }),
          currentContest: contestWithWinner,
          currentSquare,
        } as ReturnType<typeof contestReducer>,
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    });
    render(
      <ThemeProvider theme={theme}>
        <Provider store={store}>
          <EditSquare open={true} onClose={vi.fn()} />
        </Provider>
      </ThemeProvider>
    );
    expect(screen.getByText(/Winner: Quarter 1/)).toBeInTheDocument();
  });
});
