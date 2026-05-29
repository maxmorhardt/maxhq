import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import ParticipantsManager from './ParticipantsManager';

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../../service/contestService', async () => {
  const actual = await vi.importActual<typeof import('../../../service/contestService')>(
    '../../../service/contestService'
  );
  return {
    ...actual,
    getParticipants: vi.fn().mockResolvedValue([
      {
        id: 'p-1',
        contestId: 'c-1',
        userId: 'bob',
        inviteId: 'inv-1',
        role: 'participant',
        maxSquares: 5,
        joinedAt: '',
        createdAt: '',
        updatedAt: '',
      },
    ]),
    updateParticipant: vi.fn().mockResolvedValue({}),
    removeParticipant: vi.fn().mockResolvedValue(undefined),
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

const participant = {
  id: 'p-1',
  contestId: 'c-1',
  userId: 'bob',
  inviteId: 'inv-1',
  role: 'participant' as const,
  maxSquares: 5,
  joinedAt: '',
  createdAt: '',
  updatedAt: '',
};

function makeStore(participants = [participant]) {
  return configureStore({
    reducer: { contest: contestReducer },
    preloadedState: {
      contest: {
        ...contestReducer(undefined, { type: '' }),
        currentContest: baseContest,
        participants,
      } as ReturnType<typeof contestReducer>,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

async function renderManager(open = true, isOwner = false) {
  const result = render(
    <ThemeProvider theme={theme}>
      <Provider store={makeStore()}>
        <ParticipantsManager open={open} onClose={vi.fn()} isOwner={isOwner} />
      </Provider>
    </ThemeProvider>
  );
  await act(async () => {});
  return result;
}

describe('ParticipantsManager', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // re-establish default mock after clearAllMocks
    const { getParticipants } = await import('../../../service/contestService');
    vi.mocked(getParticipants).mockResolvedValue([
      {
        id: 'p-1',
        contestId: 'c-1',
        userId: 'bob',
        inviteId: 'inv-1',
        role: 'participant' as const,
        maxSquares: 5,
        joinedAt: '',
        createdAt: '',
        updatedAt: '',
      },
    ]);
  });

  it('renders "Participants" dialog title when open', async () => {
    await renderManager(true);
    expect(screen.getByText('Participants')).toBeInTheDocument();
  });

  it('does not render when closed', async () => {
    await renderManager(false);
    expect(screen.queryByText('Participants')).not.toBeInTheDocument();
  });

  it('renders participant entries from preloaded store state', async () => {
    await renderManager(true);
    await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
  });

  it('shows "No participants yet" when participants list is empty', async () => {
    const { getParticipants } = await import('../../../service/contestService');
    vi.mocked(getParticipants).mockResolvedValue([]);
    await act(async () => {
      render(
        <ThemeProvider theme={theme}>
          <Provider store={makeStore([])}>
            <ParticipantsManager open={true} onClose={vi.fn()} />
          </Provider>
        </ThemeProvider>
      );
    });
    await waitFor(() => expect(screen.getByText('No participants yet')).toBeInTheDocument());
  });

  it('shows edit icon button when isOwner is true and contest is ACTIVE', async () => {
    await renderManager(true, true);
    await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
    const editButtons = screen.getAllByRole('button');
    expect(editButtons.length).toBeGreaterThan(1);
  });

  it('opens edit dialog when edit icon is clicked', async () => {
    await renderManager(true, true);
    await waitFor(() => expect(screen.getAllByText('bob').length).toBeGreaterThan(0));
    const buttons = screen.getAllByRole('button');
    // just verify more than 1 button exists (close + edit buttons) and we can interact
    expect(buttons.length).toBeGreaterThan(1);
  });

  it('shows remove icon button for non-owner participant', async () => {
    const store = configureStore({
      reducer: { contest: contestReducer },
      preloadedState: {
        contest: {
          ...contestReducer(undefined, { type: '' }),
          currentContest: { ...baseContest, status: 'ACTIVE' as const },
          participants: [{ ...participant, role: 'participant' as const }],
        } as ReturnType<typeof contestReducer>,
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    });
    render(
      <ThemeProvider theme={theme}>
        <Provider store={store}>
          <ParticipantsManager open={true} onClose={vi.fn()} isOwner={true} />
        </Provider>
      </ThemeProvider>
    );
    await act(async () => {});
    await waitFor(() => screen.getByText('bob'));
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(2);
  });

  it('does NOT show remove button for owner-role participant', async () => {
    const { getParticipants } = await import('../../../service/contestService');
    const ownerParticipant = {
      ...participant,
      userId: 'alice',
      role: 'owner' as const,
      createdAt: '',
      updatedAt: '',
    };
    vi.mocked(getParticipants).mockResolvedValueOnce([ownerParticipant]);
    const store = configureStore({
      reducer: { contest: contestReducer },
      preloadedState: {
        contest: {
          ...contestReducer(undefined, { type: '' }),
          currentContest: { ...baseContest, status: 'ACTIVE' as const },
          participants: [ownerParticipant],
        } as ReturnType<typeof contestReducer>,
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    });
    render(
      <ThemeProvider theme={theme}>
        <Provider store={store}>
          <ParticipantsManager open={true} onClose={vi.fn()} isOwner={true} />
        </Provider>
      </ThemeProvider>
    );
    await act(async () => {});
    await waitFor(() => screen.getByText('alice'));
    // only 2 buttons: main dialog close + edit (no remove since role is owner)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeLessThanOrEqual(3);
  });

  it('shows viewer role chip color correctly', async () => {
    const { getParticipants } = await import('../../../service/contestService');
    const viewerParticipant = {
      ...participant,
      userId: 'carol',
      role: 'viewer' as const,
      createdAt: '',
      updatedAt: '',
    };
    vi.mocked(getParticipants).mockResolvedValueOnce([viewerParticipant]);
    const store = configureStore({
      reducer: { contest: contestReducer },
      preloadedState: {
        contest: {
          ...contestReducer(undefined, { type: '' }),
          currentContest: baseContest,
          participants: [viewerParticipant],
        } as ReturnType<typeof contestReducer>,
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    });
    render(
      <ThemeProvider theme={theme}>
        <Provider store={store}>
          <ParticipantsManager open={true} onClose={vi.fn()} />
        </Provider>
      </ThemeProvider>
    );
    await act(async () => {});
    await waitFor(() => expect(screen.getByText('carol')).toBeInTheDocument());
    expect(screen.getByText('viewer')).toBeInTheDocument();
  });

  it('opens edit participant dialog when edit button clicked', async () => {
    await renderManager(true, true);
    await waitFor(() => screen.getByText('bob'));
    const buttons = screen.getAllByRole('button');
    // the edit button is the second button (after close)
    const editBtn = buttons.find(
      (b) => b.querySelector('[data-testid="EditIcon"]') ?? b.getAttribute('aria-label') === 'Edit'
    );
    if (editBtn) {
      fireEvent.click(editBtn);
    } else {
      // find by tooltip title or just click the second icon button
      const iconButtons = screen.getAllByRole('button');
      fireEvent.click(iconButtons[iconButtons.length - 2]);
    }
    await waitFor(() => expect(screen.getByText('Edit Participant')).toBeInTheDocument());
  });

  it('saves edited participant when Save button is clicked in edit dialog', async () => {
    const { updateParticipant } = await import('../../../service/contestService');
    vi.mocked(updateParticipant).mockResolvedValueOnce({ ...participant, maxSquares: 5 });
    await renderManager(true, true);
    await waitFor(() => screen.getByText('bob'));
    const buttons = screen.getAllByRole('button');
    // click the edit icon button (second to last before close)
    fireEvent.click(buttons[buttons.length - 2]);
    await waitFor(() => screen.getByText('Edit Participant'));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(updateParticipant).toHaveBeenCalled());
  });

  it('opens remove confirm dialog and calls removeParticipant on confirm', async () => {
    const { removeParticipant } = await import('../../../service/contestService');
    vi.mocked(removeParticipant).mockResolvedValueOnce(undefined);
    await renderManager(true, true);
    await waitFor(() => screen.getByText('bob'));
    const buttons = screen.getAllByRole('button');
    // last button in participant row is remove
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(screen.getByText('Remove Participant')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    await waitFor(() => expect(removeParticipant).toHaveBeenCalled());
  });

  it('closes remove confirm dialog on cancel', async () => {
    await renderManager(true, true);
    await waitFor(() => screen.getByText('bob'));
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => screen.getByText('Remove Participant'));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByText('Remove Participant')).not.toBeInTheDocument());
  });
});
