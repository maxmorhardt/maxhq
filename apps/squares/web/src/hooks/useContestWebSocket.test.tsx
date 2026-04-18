import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../features/contests/contestSlice';
import { statsReducer } from '../features/stats/statsSlice';
import { toastReducer } from '../features/toast/toastSlice';
import { wsReducer } from '../features/ws/wsSlice';
import { setConnectionDetails } from '../features/ws/wsSlice';
import { useContestWebSocket } from './useContestWebSocket';
import type { ReactNode } from 'react';
import type { HandleWSEventParams } from '../types/ws';

// Mock react-oidc-context
const mockAuth = {
  isLoading: false,
  isAuthenticated: true,
  user: {
    access_token: 'test-token',
    profile: { preferred_username: 'testuser' },
  },
  signinRedirect: vi.fn(),
  signoutRedirect: vi.fn(),
};

vi.mock('react-oidc-context', () => ({
  useAuth: () => mockAuth,
}));

// Mock react-use-websocket
const mockSendJsonMessage = vi.fn();
let mockLastMessage: MessageEvent | null = null;
let mockReadyState = 1; // ReadyState.OPEN
let wsOptions: Record<string, unknown> = {};

vi.mock('react-use-websocket', () => ({
  __esModule: true,
  default: (_url: string | null, options?: Record<string, unknown>) => {
    if (options) wsOptions = options;
    return {
      lastMessage: mockLastMessage,
      readyState: mockReadyState,
      sendJsonMessage: mockSendJsonMessage,
    };
  },
  ReadyState: { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 },
}));

// Mock wsService — capture params for callback invocation
let capturedEventParams: HandleWSEventParams | null = null;
vi.mock('../service/wsService', () => ({
  getSocketUrl: vi.fn(() => 'ws://localhost:8080/ws/contests/owner/testuser/name/test'),
  contestSocketEventHandler: vi.fn((params: HandleWSEventParams) => {
    capturedEventParams = params;
  }),
}));

import { contestSocketEventHandler } from '../service/wsService';

// Mock contestThunks — return contest with squares and quarterResults for seeding
const mockContestData = {
  id: 'c1',
  name: 'test',
  owner: 'testuser',
  status: 'ACTIVE' as const,
  xLabels: [],
  yLabels: [],
  squares: [
    {
      id: 's1',
      contestId: 'c1',
      row: 2,
      col: 3,
      value: 'claimed',
      owner: 'u1',
      ownerName: 'Alice',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T01:00:00Z',
      createdBy: 'u1',
      updatedBy: 'u1',
    },
    {
      id: 's2',
      contestId: 'c1',
      row: 4,
      col: 5,
      value: '',
      owner: '',
      ownerName: '',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
      updatedBy: '',
    },
  ],
  quarterResults: [
    {
      id: 'qr1',
      contestId: 'c1',
      quarter: 1,
      homeTeamScore: 14,
      awayTeamScore: 7,
      winnerRow: 4,
      winnerCol: 7,
      winner: 'u1',
      winnerName: 'Alice',
      createdAt: '2024-01-01T02:00:00Z',
      updatedAt: '',
      createdBy: '',
      updatedBy: '',
    },
  ],
  visibility: 'public' as const,
  createdAt: '',
  updatedAt: '',
  createdBy: '',
  updatedBy: '',
};

let fetchShouldReject = false;
let fetchRejectError: { code?: number; message: string } = { code: 404, message: 'not found' };

vi.mock('../features/contests/contestThunks', async () => {
  const actual = await vi.importActual('../features/contests/contestThunks');
  return {
    ...actual,
    fetchContestByOwnerAndName: Object.assign(
      vi.fn(() => ({
        unwrap: () => {
          if (fetchShouldReject) return Promise.reject(fetchRejectError);
          return Promise.resolve(mockContestData);
        },
        type: 'contests/fetchContestByOwnerAndName/fulfilled',
      })),
      {
        pending: { type: 'contests/fetchContestByOwnerAndName/pending' },
        fulfilled: { type: 'contests/fetchContestByOwnerAndName/fulfilled' },
        rejected: { type: 'contests/fetchContestByOwnerAndName/rejected' },
      }
    ),
    fetchParticipants: Object.assign(
      vi.fn(() => ({
        unwrap: () => Promise.resolve([]),
        type: 'contests/fetchParticipants/fulfilled',
      })),
      {
        pending: { type: 'contests/fetchParticipants/pending' },
        fulfilled: { type: 'contests/fetchParticipants/fulfilled' },
        rejected: { type: 'contests/fetchParticipants/rejected' },
      }
    ),
  };
});

import { fetchContestByOwnerAndName, fetchParticipants } from '../features/contests/contestThunks';

function createTestStore() {
  return configureStore({
    reducer: { contest: contestReducer, stats: statsReducer, toast: toastReducer, ws: wsReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

function simulateServerConnected(store: ReturnType<typeof createTestStore>) {
  store.dispatch(
    setConnectionDetails({
      type: 'connected',
      contestId: 'c1',
      updatedBy: 'server',
      timestamp: new Date().toISOString(),
      connectionId: 'conn-1',
    })
  );
}

function createWrapper(store: ReturnType<typeof createTestStore>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

const defaultParams = {
  owner: 'testuser',
  name: 'test',
  onContestDeleted: vi.fn(),
  onParticipantRemoved: vi.fn(),
  onWinnerSquare: vi.fn(),
  onWinnerDialog: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockLastMessage = null;
  mockReadyState = 1;
  wsOptions = {};
  capturedEventParams = null;
  mockAuth.isLoading = false;
  mockAuth.isAuthenticated = true;
  mockAuth.user = { access_token: 'test-token', profile: { preferred_username: 'testuser' } };
  fetchShouldReject = false;
  fetchRejectError = { code: 404, message: 'not found' };
});

describe('useContestWebSocket', () => {
  it('should return initial state', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useContestWebSocket(defaultParams), {
      wrapper: createWrapper(store),
    });

    expect(result.current.isConnecting).toBe(true);
    expect(result.current.connectionFailed).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.wsCloseCode).toBeNull();
    expect(result.current.hasFatalWsError).toBe(false);
    expect(result.current.fetchErrorCode).toBeNull();
    expect(result.current.activityEvents).toEqual([]);
    expect(result.current.chatMessages).toEqual([]);
  });

  it('should report connected when readyState is OPEN', () => {
    mockReadyState = 1;
    const store = createTestStore();
    const { result } = renderHook(() => useContestWebSocket(defaultParams), {
      wrapper: createWrapper(store),
    });
    expect(result.current.isConnected).toBe(true);
  });

  it('should report not connected when readyState is CLOSED', () => {
    mockReadyState = 3;
    const store = createTestStore();
    const { result } = renderHook(() => useContestWebSocket(defaultParams), {
      wrapper: createWrapper(store),
    });
    expect(result.current.isConnected).toBe(false);
  });

  it('should send chat message when connected', () => {
    mockReadyState = 1;
    const store = createTestStore();
    const { result } = renderHook(() => useContestWebSocket(defaultParams), {
      wrapper: createWrapper(store),
    });
    act(() => result.current.sendChatMessage('hello'));
    expect(mockSendJsonMessage).toHaveBeenCalledWith({ message: 'hello' });
  });

  it('should not send chat message when disconnected', () => {
    mockReadyState = 3;
    const store = createTestStore();
    const { result } = renderHook(() => useContestWebSocket(defaultParams), {
      wrapper: createWrapper(store),
    });
    act(() => result.current.sendChatMessage('hello'));
    expect(mockSendJsonMessage).not.toHaveBeenCalled();
  });

  it('should detect fatal ws error for known close codes', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useContestWebSocket(defaultParams), {
      wrapper: createWrapper(store),
    });
    act(() => {
      (wsOptions.onClose as (e: CloseEvent) => void)?.({ code: 4404 } as CloseEvent);
    });
    expect(result.current.hasFatalWsError).toBe(true);
    expect(result.current.wsCloseCode).toBe(4404);
    expect(result.current.isConnecting).toBe(false);
  });

  it('should not set fatal for non-fatal close codes', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useContestWebSocket(defaultParams), {
      wrapper: createWrapper(store),
    });
    act(() => {
      (wsOptions.onClose as (e: CloseEvent) => void)?.({ code: 1000 } as CloseEvent);
    });
    expect(result.current.hasFatalWsError).toBe(false);
    expect(result.current.wsCloseCode).toBeNull();
  });

  it('should increment retry count on error', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useContestWebSocket(defaultParams), {
      wrapper: createWrapper(store),
    });
    act(() => (wsOptions.onError as () => void)?.());
    expect(result.current.retryCount).toBe(1);
    expect(result.current.connectionFailed).toBe(false);
  });

  it('should set connectionFailed after max retries', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useContestWebSocket(defaultParams), {
      wrapper: createWrapper(store),
    });
    act(() => {
      for (let i = 0; i < 5; i++) (wsOptions.onError as () => void)?.();
    });
    expect(result.current.connectionFailed).toBe(true);
  });

  it('should reset state on open', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useContestWebSocket(defaultParams), {
      wrapper: createWrapper(store),
    });
    act(() => (wsOptions.onError as () => void)?.());
    act(() => (wsOptions.onOpen as () => void)?.());
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.connectionFailed).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  describe('connectionStatus', () => {
    it('should be failed when connectionFailed', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });
      act(() => {
        for (let i = 0; i < 5; i++) (wsOptions.onError as () => void)?.();
      });
      expect(result.current.connectionStatus).toBe('failed');
    });

    it('should be connected when open and not failed', () => {
      mockReadyState = 1;
      const store = createTestStore();
      const { result } = renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });
      act(() => (wsOptions.onOpen as () => void)?.());
      expect(result.current.connectionStatus).toBe('connected');
    });

    it('should be reconnecting when retryCount > 0 and not connected', () => {
      mockReadyState = 3;
      const store = createTestStore();
      const { result } = renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });
      act(() => (wsOptions.onOpen as () => void)?.());
      act(() => (wsOptions.onError as () => void)?.());
      expect(result.current.connectionStatus).toBe('reconnecting');
    });

    it('should be connecting initially', () => {
      mockReadyState = 0;
      const store = createTestStore();
      const { result } = renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });
      expect(result.current.connectionStatus).toBe('connecting');
    });
  });

  describe('fetch contest effect', () => {
    it('should fetch contest and seed activity events on connect', async () => {
      mockReadyState = 1;
      const store = createTestStore();
      const { result } = renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      act(() => simulateServerConnected(store));

      await waitFor(() => {
        expect(fetchContestByOwnerAndName).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(fetchParticipants).toHaveBeenCalledWith('c1');
      });

      // should have seeded activity from claimed squares (1 claimed) + quarterResults (1)
      await waitFor(() => {
        expect(result.current.activityEvents).toHaveLength(2);
      });

      // square event first (earlier timestamp), then quarter result
      expect(result.current.activityEvents[0].type).toBe('square_claimed');
      expect(result.current.activityEvents[0].message).toContain('Alice');
      expect(result.current.activityEvents[1].type).toBe('quarter_winner');
    });

    it('should not fetch if owner is undefined', async () => {
      mockReadyState = 1;
      const store = createTestStore();
      renderHook(() => useContestWebSocket({ ...defaultParams, owner: undefined }), {
        wrapper: createWrapper(store),
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(fetchContestByOwnerAndName).not.toHaveBeenCalled();
    });

    it('should not fetch if name is undefined', async () => {
      mockReadyState = 1;
      const store = createTestStore();
      renderHook(() => useContestWebSocket({ ...defaultParams, name: undefined }), {
        wrapper: createWrapper(store),
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(fetchContestByOwnerAndName).not.toHaveBeenCalled();
    });

    it('should not fetch if not connected', async () => {
      mockReadyState = 3;
      const store = createTestStore();
      renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(fetchContestByOwnerAndName).not.toHaveBeenCalled();
    });

    it('should set fetchErrorCode on fetch failure', async () => {
      fetchShouldReject = true;
      fetchRejectError = { code: 403, message: 'forbidden' };
      mockReadyState = 1;
      const store = createTestStore();
      const { result } = renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      act(() => simulateServerConnected(store));

      await waitFor(() => {
        expect(result.current.fetchErrorCode).toBe(403);
      });
    });

    it('should default fetchErrorCode to 500 when code missing', async () => {
      fetchShouldReject = true;
      fetchRejectError = { message: 'unknown' };
      mockReadyState = 1;
      const store = createTestStore();
      const { result } = renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      act(() => simulateServerConnected(store));

      await waitFor(() => {
        expect(result.current.fetchErrorCode).toBe(500);
      });
    });
  });

  describe('WS message handler callbacks', () => {
    it('should call contestSocketEventHandler with callbacks', () => {
      mockReadyState = 1;
      const store = createTestStore();
      renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      expect(contestSocketEventHandler).toHaveBeenCalled();
      expect(capturedEventParams).not.toBeNull();
      expect(capturedEventParams?.callbacks).toBeDefined();
    });

    it('onSquareUpdate callback should add activity event', async () => {
      mockReadyState = 1;
      const store = createTestStore();
      const { result } = renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      act(() => simulateServerConnected(store));
      await waitFor(() => expect(fetchContestByOwnerAndName).toHaveBeenCalled());

      act(() => {
        capturedEventParams?.callbacks?.onSquareUpdate?.('val', 1, 2, 'Bob');
      });

      await waitFor(() => {
        const squareEvent = result.current.activityEvents.find((e) => e.message.includes('Bob'));
        expect(squareEvent).toBeDefined();
        expect(squareEvent?.message).toContain('Bob claimed square (1, 2)');
      });
    });

    it('onContestUpdate callback should add activity event for status change', async () => {
      mockReadyState = 1;
      const store = createTestStore();
      const { result } = renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      act(() => simulateServerConnected(store));
      await waitFor(() => expect(fetchContestByOwnerAndName).toHaveBeenCalled());

      act(() => {
        capturedEventParams?.callbacks?.onContestUpdate?.('Q1');
      });

      await waitFor(() => {
        const statusEvent = result.current.activityEvents.find((e) => e.type === 'contest_status');
        expect(statusEvent).toBeDefined();
        expect(statusEvent?.message).toContain('Q1');
      });
    });

    it('onContestUpdate callback should not add event without status', () => {
      mockReadyState = 1;
      const store = createTestStore();
      renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      act(() => {
        capturedEventParams?.callbacks?.onContestUpdate?.(undefined);
      });

      // No contest_status event should exist (empty string or undefined status is skipped)
    });

    it('onQuarterResultUpdate callback should add event and call onWinnerSquare', async () => {
      mockReadyState = 1;
      const store = createTestStore();
      const { result } = renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      act(() => simulateServerConnected(store));
      await waitFor(() => expect(fetchContestByOwnerAndName).toHaveBeenCalled());

      act(() => {
        capturedEventParams?.callbacks?.onQuarterResultUpdate?.(
          2,
          'Alice',
          21,
          14,
          3,
          5,
          'otheruser'
        );
      });

      await waitFor(() => {
        const qrEvent = result.current.activityEvents.find((e) => e.message.includes('Q2 winner'));
        expect(qrEvent).toBeDefined();
      });

      expect(defaultParams.onWinnerSquare).toHaveBeenCalledWith(3, 5);
      expect(defaultParams.onWinnerDialog).not.toHaveBeenCalled();
    });

    it('onQuarterResultUpdate should call onWinnerDialog when winner is current user', async () => {
      mockReadyState = 1;
      const store = createTestStore();
      renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      act(() => simulateServerConnected(store));
      await waitFor(() => expect(fetchContestByOwnerAndName).toHaveBeenCalled());

      act(() => {
        capturedEventParams?.callbacks?.onQuarterResultUpdate?.(
          1,
          'testuser',
          14,
          7,
          4,
          7,
          'testuser'
        );
      });

      expect(defaultParams.onWinnerSquare).toHaveBeenCalledWith(4, 7);
      expect(defaultParams.onWinnerDialog).toHaveBeenCalledWith({
        quarter: 1,
        homeScore: 14,
        awayScore: 7,
        row: 4,
        col: 7,
      });
    });

    it('onError callback should show toast', () => {
      mockReadyState = 1;
      const store = createTestStore();
      renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      act(() => {
        capturedEventParams?.callbacks?.onError?.('ws error msg');
      });

      const toasts = store.getState().toast.messages;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('ws error msg');
      expect(toasts[0].severity).toBe('error');
    });

    it('onChatMessage callback should add chat message', () => {
      mockReadyState = 1;
      const store = createTestStore();
      const { result } = renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      act(() => {
        capturedEventParams?.callbacks?.onChatMessage?.(
          'Alice',
          'hello world',
          '2024-01-01T00:00:00Z'
        );
      });

      expect(result.current.chatMessages).toHaveLength(1);
      expect(result.current.chatMessages[0].sender).toBe('Alice');
      expect(result.current.chatMessages[0].message).toBe('hello world');
    });
  });

  describe('error toast effect', () => {
    it('should show toast and clear error when store has error', async () => {
      const store = createTestStore();
      store.dispatch({
        type: 'contests/fetchByUser/rejected',
        payload: { message: 'store error' },
      });

      renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      await waitFor(() => {
        expect(store.getState().toast.messages.some((t) => t.message === 'store error')).toBe(true);
      });

      await waitFor(() => {
        expect(store.getState().contest.error).toBeNull();
      });
    });
  });

  describe('reset on owner/name change', () => {
    it('should reset state when owner changes', async () => {
      mockReadyState = 1;
      const store = createTestStore();
      let params = { ...defaultParams };
      const { result, rerender } = renderHook(() => useContestWebSocket(params), {
        wrapper: createWrapper(store),
      });

      act(() => simulateServerConnected(store));
      await waitFor(() => expect(fetchContestByOwnerAndName).toHaveBeenCalled());

      params = { ...defaultParams, owner: 'otheruser' };
      rerender();

      expect(result.current.activityEvents).toEqual([]);
      expect(result.current.chatMessages).toEqual([]);
      expect(result.current.fetchErrorCode).toBeNull();
    });
  });

  describe('shouldReconnect', () => {
    it('should allow reconnect for non-fatal codes', () => {
      const store = createTestStore();
      renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      const shouldReconnect = wsOptions.shouldReconnect as (event: CloseEvent) => boolean;
      expect(shouldReconnect({ code: 1000 } as CloseEvent)).toBe(true);
    });

    it('should not reconnect for fatal close codes', () => {
      const store = createTestStore();
      renderHook(() => useContestWebSocket(defaultParams), {
        wrapper: createWrapper(store),
      });

      const shouldReconnect = wsOptions.shouldReconnect as (event: CloseEvent) => boolean;
      expect(shouldReconnect({ code: 4404 } as CloseEvent)).toBe(false);
      expect(shouldReconnect({ code: 4500 } as CloseEvent)).toBe(false);
      expect(shouldReconnect({ code: 4503 } as CloseEvent)).toBe(false);
    });
  });
});
