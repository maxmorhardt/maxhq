import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';
import { contestReducer } from '../features/contests/contestSlice';
import { toastReducer } from '../features/toast/toastSlice';
import type { Contest, ContestEvent, Participant, QuarterResult } from '../types/contest';
import type { StreamFrame } from '../types/events';
import { useContestEvents } from './useContestEvents';

const mockAuth = {
  isLoading: false,
  isAuthenticated: true,
  user: { id_token: 'token-1', profile: { email: 'me@b.com' } },
};

vi.mock('react-oidc-context', () => ({
  useAuth: () => mockAuth,
}));

// each stream call becomes a connection the test drives frame by frame
interface Connection {
  lastEventId: string | null;
  token: string;
  emit: (event: ContestEvent, id?: string) => void;
  end: () => void;
  fail: (err: unknown) => void;
}

const connections: Connection[] = [];
// false simulates a request that fails before the server answers, so the hook never sees an open stream
let opensOnConnect = true;

vi.mock('../service/contestEvents', async () => {
  const actual = await vi.importActual<typeof import('../service/contestEvents')>(
    '../service/contestEvents'
  );
  return {
    ...actual,
    streamContestEvents: vi.fn(
      (opts: {
        token: string;
        lastEventId: string | null;
        signal: AbortSignal;
        onOpen?: () => void;
        onFrame: (f: StreamFrame) => void;
      }) =>
        new Promise<void>((resolve, reject) => {
          const conn: Connection = {
            lastEventId: opts.lastEventId,
            token: opts.token,
            emit: (event, id) =>
              opts.onFrame({ id: id ?? null, event: event.type, data: JSON.stringify(event) }),
            end: resolve,
            fail: reject,
          };
          opts.signal.addEventListener('abort', () => resolve());
          connections.push(conn);
          if (opensOnConnect) {
            opts.onOpen?.();
          }
        })
    ),
  };
});

import { StreamHTTPError } from '../service/contestEvents';

const contest: Contest = {
  id: 'c1',
  name: 'C',
  xLabels: [],
  yLabels: [],
  status: 'ACTIVE',
  visibility: 'private',
  squares: [
    {
      id: 's1',
      contestId: 'c1',
      row: 0,
      col: 0,
      value: 'MM',
      owner: 'me@b.com',
      ownerName: 'Me',
      version: 2,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: '',
      updatedBy: '',
    },
  ],
  quarterResults: [],
  owner: 'o@b.com',
  version: 1,
  createdAt: '',
  updatedAt: '',
  createdBy: '',
  updatedBy: '',
};

const participant: Participant = {
  id: 'p1',
  contestId: 'c1',
  userId: 'me@b.com',
  inviteId: 'i1',
  role: 'participant',
  maxSquares: 5,
  joinedAt: '2026-01-02T00:00:00Z',
  createdAt: '',
  updatedAt: '',
};

const quarter: QuarterResult = {
  id: 'q1',
  contestId: 'c1',
  quarter: 1,
  homeTeamScore: 7,
  awayTeamScore: 3,
  winnerRow: 0,
  winnerCol: 0,
  winner: 'me@b.com',
  winnerName: 'Me',
  createdAt: '',
  updatedAt: '',
  createdBy: '',
  updatedBy: '',
};

function ev(overrides: Partial<ContestEvent>): ContestEvent {
  return { type: 'square_update', contestId: 'c1', updatedBy: 'u', timestamp: 'now', ...overrides };
}

function renderEvents(id: string | undefined = 'c1') {
  const store = configureStore({ reducer: { contest: contestReducer, toast: toastReducer } });
  const handlers = {
    onContestDeleted: vi.fn(),
    onParticipantRemoved: vi.fn(),
    onWinnerSquare: vi.fn(),
    onWinnerDialog: vi.fn(),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const hook = renderHook(({ contestId }) => useContestEvents({ id: contestId, ...handlers }), {
    wrapper,
    initialProps: { contestId: id },
  });
  return { ...hook, store, handlers };
}

async function connected(): Promise<Connection> {
  await waitFor(() => expect(connections.length).toBeGreaterThan(0));
  const conn = connections[connections.length - 1];
  act(() => conn.emit(ev({ type: 'connected', contest, participants: [participant] }), '10'));
  return conn;
}

describe('useContestEvents', () => {
  beforeEach(() => {
    connections.length = 0;
    opensOnConnect = true;
    mockAuth.isAuthenticated = true;
    mockAuth.user.id_token = 'token-1';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not connect without a token or contest id', () => {
    mockAuth.isAuthenticated = false;
    const { result } = renderEvents();

    expect(connections).toHaveLength(0);
    expect(result.current.connectionStatus).toBe('connecting');
  });

  it('loads the snapshot and seeds the activity feed', async () => {
    const { result, store } = renderEvents();
    await connected();

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionStatus).toBe('connected');
    expect(store.getState().contest.currentContest?.id).toBe('c1');
    expect(result.current.activityEvents.map((e) => e.type)).toEqual([
      'square_claimed',
      'participant_added',
    ]);
  });

  it('turns live events into activity and winner callbacks', async () => {
    const { result, handlers } = renderEvents();
    const conn = await connected();

    act(() => {
      conn.emit(
        ev({ square: { ...contest.squares[0], value: '', ownerName: '', version: 3 } }),
        '11'
      );
      conn.emit(ev({ square: { ...contest.squares[0], value: 'XY', version: 4 } }), '12');
      conn.emit(ev({ type: 'contest_update', contest: { ...contest, status: 'Q1' } }), '13');
      conn.emit(ev({ type: 'quarter_result_update', quarterResult: quarter }), '14');
      conn.emit(ev({ type: 'quarter_result_rollback', quarterResult: quarter }), '15');
      conn.emit(
        ev({
          type: 'participant_added',
          participant: { ...participant, userId: 'x@b.com', id: 'p2' },
        }),
        '16'
      );
      conn.emit(ev({ type: 'participant_removed', participant }), '17');
    });

    const messages = result.current.activityEvents.map((e) => e.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        'Square (0, 0) was cleared',
        'Me claimed square (0, 0)',
        'Contest status changed to Q1',
        'Q1 winner: Me (7-3)',
        'Q1 result was rolled back',
        'x@b.com joined the contest',
        'me@b.com was removed',
      ])
    );
    expect(handlers.onWinnerSquare).toHaveBeenCalledWith(0, 0);
    expect(handlers.onWinnerDialog).toHaveBeenCalledWith({
      quarter: 1,
      homeScore: 7,
      awayScore: 3,
      row: 0,
      col: 0,
    });
    expect(handlers.onParticipantRemoved).toHaveBeenCalledWith(true, true);
  });

  it('reconnects with the last event id after the server ends the stream', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderEvents();
    const first = await connected();
    act(() => first.emit(ev({ square: contest.squares[0] }), '12'));

    await act(async () => {
      first.end();
    });
    expect(result.current.connectionStatus).toBe('reconnecting');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await waitFor(() => expect(connections).toHaveLength(2));
    expect(connections[1].lastEventId).toBe('12');
  });

  it('a refreshed token resumes the same stream position', async () => {
    const { rerender } = renderEvents();
    await connected();

    mockAuth.user.id_token = 'token-2';
    rerender({ contestId: 'c1' });

    await waitFor(() => expect(connections).toHaveLength(2));
    expect(connections[1].token).toBe('token-2');
    expect(connections[1].lastEventId).toBe('10');
  });

  it('stops on a forbidden or missing contest', async () => {
    const { result } = renderEvents();
    await waitFor(() => expect(connections).toHaveLength(1));

    await act(async () => {
      connections[0].fail(new StreamHTTPError(404));
    });

    expect(result.current.hasFatalError).toBe(true);
    expect(result.current.fatalStatus).toBe(404);
    expect(connections).toHaveLength(1);
  });

  it('treats a revoked event as forbidden and stops reconnecting', async () => {
    const { result } = renderEvents();
    const conn = await connected();

    await act(async () => {
      conn.emit(ev({ type: 'revoked' }), '20');
      conn.end();
    });

    expect(result.current.fatalStatus).toBe(403);
    expect(connections).toHaveLength(1);
  });

  it('stops after a deleted contest', async () => {
    const { handlers } = renderEvents();
    const conn = await connected();

    await act(async () => {
      conn.emit(ev({ type: 'contest_deleted' }), '21');
      conn.end();
    });

    expect(handlers.onContestDeleted).toHaveBeenCalled();
    expect(connections).toHaveLength(1);
  });

  it('gives up after repeated failures', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    opensOnConnect = false;
    const { result } = renderEvents();

    for (let attempt = 0; attempt <= 5; attempt++) {
      await waitFor(() => expect(connections).toHaveLength(attempt + 1));
      await act(async () => {
        connections[attempt].fail(new Error('network'));
        await vi.advanceTimersByTimeAsync(20000);
      });
    }

    expect(result.current.connectionFailed).toBe(true);
    expect(result.current.connectionStatus).toBe('failed');
  });

  it('toasts on an undecodable frame', async () => {
    const { store } = renderEvents();
    await waitFor(() => expect(connections).toHaveLength(1));

    act(() => {
      (connections[0] as unknown as { emit: (e: unknown) => void }).emit({ type: 'x' });
    });

    expect(store.getState().toast.messages.length).toBeGreaterThan(0);
  });

  it('forceReconnect starts over without a last event id', async () => {
    const { result } = renderEvents();
    await connected();

    act(() => result.current.forceReconnect());

    await waitFor(() => expect(connections).toHaveLength(2));
    expect(connections[1].lastEventId).toBeNull();
  });

  it('switching contests resets the stream position', async () => {
    const { rerender } = renderEvents('c1');
    await connected();

    rerender({ contestId: 'c2' });

    await waitFor(() => expect(connections).toHaveLength(2));
    expect(connections[1].lastEventId).toBeNull();
  });
});
