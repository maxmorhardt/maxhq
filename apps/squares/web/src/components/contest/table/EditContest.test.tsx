import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import EditContest from './EditContest';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../../service/contestService', async () => {
  const actual = await vi.importActual<typeof import('../../../service/contestService')>(
    '../../../service/contestService'
  );
  return { ...actual, updateContestById: vi.fn().mockResolvedValue({}) };
});

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

const contest = {
  id: 'c-1',
  name: 'Super Bowl LX',
  xLabels: [],
  yLabels: [],
  status: 'ACTIVE' as const,
  visibility: 'public' as const,
  squares: [],
  owner: 'alice',
  homeTeam: 'Chiefs',
  awayTeam: 'Eagles',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  createdBy: 'alice',
  updatedBy: 'alice',
};

function makeStore(currentContest: typeof contest | null = contest) {
  return configureStore({
    reducer: { contest: contestReducer },
    preloadedState: {
      contest: { ...contestReducer(undefined, { type: '' }), currentContest } as ReturnType<
        typeof contestReducer
      >,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

function renderDialog(open = true, currentContest: typeof contest | null = contest) {
  return render(
    <ThemeProvider theme={theme}>
      <Provider store={makeStore(currentContest)}>
        <EditContest open={open} onClose={vi.fn()} />
      </Provider>
    </ThemeProvider>
  );
}

describe('EditContest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { profile: { email: 'alice' } },
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('renders nothing when currentContest is null', () => {
    const { container } = renderDialog(true, null);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders "Edit Contest" title for the contest owner', () => {
    renderDialog();
    expect(screen.getByText('Edit Contest')).toBeInTheDocument();
  });

  it('renders "View Contest" title for non-owners', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { profile: { email: 'bob' } },
    } as unknown as ReturnType<typeof useAuth>);
    renderDialog();
    expect(screen.getByText('View Contest')).toBeInTheDocument();
  });

  it('renders read-only "View Contest" with no Save for a finished contest the user owns', () => {
    renderDialog(true, { ...contest, status: 'FINISHED' as const });
    expect(screen.getByText('View Contest')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Home Team')).not.toBeInTheDocument();
  });

  it('calls updateContestById when Save is clicked as owner', async () => {
    const { updateContestById } = await import('../../../service/contestService');
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(updateContestById).toHaveBeenCalled());
  });
});
