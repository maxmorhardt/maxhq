import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import InviteManager from './InviteManager';

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../../service/contestService', async () => {
  const actual = await vi.importActual<typeof import('../../../service/contestService')>(
    '../../../service/contestService'
  );
  return {
    ...actual,
    getInvites: vi.fn().mockResolvedValue([]),
    createInvite: vi.fn().mockResolvedValue({ token: 'abc', url: 'http://example.com/join/abc' }),
    deleteInvite: vi.fn().mockResolvedValue(undefined),
  };
});

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

function makeStore() {
  return configureStore({
    reducer: { contest: contestReducer },
    preloadedState: {
      contest: { ...contestReducer(undefined, { type: '' }), currentContest: baseContest },
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

async function renderManager(open = true, onClose = vi.fn()) {
  const result = render(
    <ThemeProvider theme={theme}>
      <Provider store={makeStore()}>
        <InviteManager open={open} onClose={onClose} />
      </Provider>
    </ThemeProvider>
  );
  await act(async () => {});
  return result;
}

describe('InviteManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Invite Links" dialog title when open', async () => {
    await renderManager(true);
    expect(screen.getByText('Invite Links')).toBeInTheDocument();
  });

  it('does not render dialog content when closed', async () => {
    await renderManager(false);
    expect(screen.queryByText('Invite Links')).not.toBeInTheDocument();
  });

  it('renders the Generate Invite Link button', async () => {
    await renderManager(true);
    expect(screen.getByRole('button', { name: /generate invite link/i })).toBeInTheDocument();
  });

  it('calls createInvite service after clicking Generate Invite Link', async () => {
    const { createInvite } = await import('../../../service/contestService');
    await renderManager(true);
    fireEvent.click(screen.getByRole('button', { name: /generate invite link/i }));
    await waitFor(() => expect(createInvite).toHaveBeenCalled());
  });

  it('shows active invite list when store has invites', async () => {
    const { getInvites } = await import('../../../service/contestService');
    vi.mocked(getInvites).mockResolvedValueOnce([
      {
        id: 'inv-1',
        contestId: 'c-1',
        token: 'tok1',
        maxSquares: 10,
        role: 'participant' as const,
        uses: 2,
        maxUses: 5,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: '',
        createdBy: 'alice',
        updatedAt: '',
      },
    ]);
    await renderManager(true);
    await waitFor(() => expect(screen.getByText(/active invite links/i)).toBeInTheDocument());
    expect(screen.getByText(/2\/5 uses/)).toBeInTheDocument();
  });

  it('changes max uses input', async () => {
    await renderManager(true);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '3' } });
    expect((inputs[0] as HTMLInputElement).value).toBe('3');
  });

  it('changes expires in input', async () => {
    await renderManager(true);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: '60' } });
    expect((inputs[1] as HTMLInputElement).value).toBe('60');
  });

  it('renders role select with participant as default', async () => {
    await renderManager(true);
    expect(screen.getByText('Participant')).toBeInTheDocument();
  });

  it('shows error state on create invite failure', async () => {
    const { createInvite } = await import('../../../service/contestService');
    vi.mocked(createInvite).mockRejectedValueOnce(new Error('fail'));
    await renderManager(true);
    fireEvent.click(screen.getByRole('button', { name: /generate invite link/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /failed.*retry/i })).toBeInTheDocument()
    );
  });

  it('shows invite without maxUses when maxUses is absent', async () => {
    const { getInvites } = await import('../../../service/contestService');
    vi.mocked(getInvites).mockResolvedValueOnce([
      {
        id: 'inv-2',
        contestId: 'c-1',
        token: 'tok2',
        maxSquares: 5,
        role: 'participant' as const,
        uses: 0,
        createdAt: '',
        createdBy: 'alice',
        updatedAt: '',
      },
    ]);
    await renderManager(true);
    await waitFor(() => expect(screen.getByText(/0 uses/)).toBeInTheDocument());
  });

  it('calls deleteInvite when delete icon button is clicked', async () => {
    const { getInvites, deleteInvite } = await import('../../../service/contestService');
    vi.mocked(getInvites).mockResolvedValueOnce([
      {
        id: 'inv-3',
        contestId: 'c-1',
        token: 'tok3',
        maxSquares: 10,
        role: 'participant' as const,
        uses: 0,
        createdAt: '',
        createdBy: 'alice',
        updatedAt: '',
      },
    ]);
    await renderManager(true);
    // wait for invites to render, then find and click the last icon button (delete)
    await waitFor(() => expect(screen.getByText(/0 uses/)).toBeInTheDocument());
    const iconBtns = screen.getAllByRole('button').filter((b) => b.querySelector('svg'));
    // last icon button in the invite row is delete
    fireEvent.click(iconBtns[iconBtns.length - 1]);
    await waitFor(() => expect(deleteInvite).toHaveBeenCalled());
  });
});
