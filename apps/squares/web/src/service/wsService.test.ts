import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSocketUrl, contestSocketEventHandler } from './wsService';
import {
  addParticipantFromWebSocket,
  removeParticipantFromWebSocket,
  updateContestFromWebSocket,
  updateQuarterResultFromWebSocket,
  updateSquareFromWebSocket,
} from '../features/contests/contestSlice';
import { setConnectionDetails, setDisconnectionDetails } from '../features/ws/wsSlice';
import type { HandleWSEventParams, WSUICallbacks } from '../types/ws';

vi.mock('../features/contests/contestSlice', () => ({
  updateSquareFromWebSocket: vi.fn((p) => ({ type: 'updateSquare', payload: p })),
  updateContestFromWebSocket: vi.fn((p) => ({ type: 'updateContest', payload: p })),
  updateQuarterResultFromWebSocket: vi.fn((p) => ({ type: 'updateQR', payload: p })),
  addParticipantFromWebSocket: vi.fn((p) => ({ type: 'addParticipant', payload: p })),
  removeParticipantFromWebSocket: vi.fn((p) => ({ type: 'removeParticipant', payload: p })),
}));

vi.mock('../features/ws/wsSlice', () => ({
  setLatestMessage: vi.fn((p) => ({ type: 'setLatest', payload: p })),
  setConnectionDetails: vi.fn((p) => ({ type: 'setConn', payload: p })),
  setDisconnectionDetails: vi.fn((p) => ({ type: 'setDisconn', payload: p })),
}));

describe('getSocketUrl', () => {
  const makeAuth = (token?: string) =>
    ({ user: token ? { access_token: token } : null }) as ReturnType<
      typeof import('react-oidc-context').useAuth
    >;

  it('should return null if owner is undefined', () => {
    expect(getSocketUrl(undefined, 'name', makeAuth('tok'))).toBeNull();
  });

  it('should return null if name is undefined', () => {
    expect(getSocketUrl('owner', undefined, makeAuth('tok'))).toBeNull();
  });

  it('should return null if no access token', () => {
    expect(getSocketUrl('owner', 'name', makeAuth())).toBeNull();
  });

  it('should return ws url in non-prod environment', () => {
    const url = getSocketUrl('owner', 'my contest', makeAuth('tok'));
    expect(url).toContain('/ws/contests/owner/owner/name/my%20contest');
  });

  it('should encode owner and name in the URL', () => {
    const url = getSocketUrl('user@1', 'a&b', makeAuth('tok'));
    expect(url).toContain(encodeURIComponent('user@1'));
    expect(url).toContain(encodeURIComponent('a&b'));
  });
});

describe('contestSocketEventHandler', () => {
  let dispatch: HandleWSEventParams['dispatch'];
  let lastProcessedMessageRef: React.RefObject<string | null>;
  let callbacks: Required<WSUICallbacks>;

  const baseParams = (overrides?: Partial<HandleWSEventParams>): HandleWSEventParams => ({
    lastMessage: null,
    dispatch: dispatch,
    currentContestId: 'contest-1',
    lastProcessedMessageRef,
    callbacks: callbacks as HandleWSEventParams['callbacks'],
    ...overrides,
  });

  const makeMessage = (data: string) => ({ data }) as MessageEvent;

  beforeEach(() => {
    dispatch = vi.fn() as unknown as HandleWSEventParams['dispatch'];
    lastProcessedMessageRef = { current: null };
    callbacks = {
      onConnected: vi.fn(),
      onSquareUpdate: vi.fn(),
      onContestUpdate: vi.fn(),
      onQuarterResultUpdate: vi.fn(),
      onContestDeleted: vi.fn(),
      onChatMessage: vi.fn(),
      onError: vi.fn(),
      onParticipantAdded: vi.fn(),
      onParticipantRemoved: vi.fn(),
    };
    vi.clearAllMocks();
  });

  it('should do nothing when lastMessage is null', () => {
    contestSocketEventHandler(baseParams());
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should do nothing when lastMessage.data is null', () => {
    contestSocketEventHandler(
      baseParams({ lastMessage: { data: null } as unknown as MessageEvent })
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should skip duplicate messages', () => {
    const data = JSON.stringify({
      type: 'connected',
      contestId: 'contest-1',
      updatedBy: 'user1',
      timestamp: '2025-01-01',
    });
    lastProcessedMessageRef.current = data;

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should handle invalid JSON gracefully', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    contestSocketEventHandler(baseParams({ lastMessage: makeMessage('not json') }));
    expect(callbacks.onError).toHaveBeenCalledWith('Failed to parse server message');
    spy.mockRestore();
  });

  it('should reject invalid message structure', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const data = JSON.stringify({ foo: 'bar' });
    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(callbacks.onError).toHaveBeenCalledWith('Received invalid message from server');
    spy.mockRestore();
  });

  it('should ignore messages for a different contest', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = JSON.stringify({
      type: 'square_update',
      contestId: 'other-contest',
      updatedBy: 'user1',
      timestamp: '2025-01-01',
      square: { id: 'sq1', value: 'X', row: 0, col: 0, ownerName: 'X' },
    });
    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(dispatch).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should handle square_update messages', () => {
    const square = {
      id: 'sq1',
      value: 'Alice',
      row: 2,
      col: 3,
      ownerName: 'Alice',
    };
    const data = JSON.stringify({
      type: 'square_update',
      contestId: 'contest-1',
      updatedBy: 'user1',
      timestamp: '2025-01-01',
      square,
    });

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));

    expect(dispatch).toHaveBeenCalled();
    expect(updateSquareFromWebSocket).toHaveBeenCalledWith(square);
    expect(callbacks.onSquareUpdate).toHaveBeenCalledWith('Alice', 2, 3, 'Alice');
  });

  it('should handle contest_update messages', () => {
    const contest = {
      xLabels: [0, 1],
      yLabels: [2, 3],
      homeTeam: 'Eagles',
      awayTeam: 'Chiefs',
      status: 'Q1',
    };
    const data = JSON.stringify({
      type: 'contest_update',
      contestId: 'contest-1',
      updatedBy: 'user1',
      timestamp: '2025-01-01',
      contest,
    });

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));

    expect(updateContestFromWebSocket).toHaveBeenCalledWith(contest);
    expect(callbacks.onContestUpdate).toHaveBeenCalledWith('Q1');
  });

  it('should handle quarter_result_update messages', () => {
    const quarterResult = {
      quarter: 1,
      homeTeamScore: 14,
      awayTeamScore: 7,
      winnerRow: 4,
      winnerCol: 7,
      winner: 'user2',
      winnerName: 'Bob',
    };
    const data = JSON.stringify({
      type: 'quarter_result_update',
      contestId: 'contest-1',
      updatedBy: 'user1',
      timestamp: '2025-01-01',
      quarterResult,
    });

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));

    expect(updateQuarterResultFromWebSocket).toHaveBeenCalledWith(quarterResult);
    expect(callbacks.onQuarterResultUpdate).toHaveBeenCalledWith(1, 'Bob', 14, 7, 4, 7, 'user2');
  });

  it('should handle contest_deleted messages', () => {
    const data = JSON.stringify({
      type: 'contest_deleted',
      contestId: 'contest-1',
      updatedBy: 'user1',
      timestamp: '2025-01-01',
    });

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(callbacks.onContestDeleted).toHaveBeenCalled();
  });

  it('should handle participant_added messages', () => {
    const participant = {
      id: 'p1',
      contestId: 'contest-1',
      userId: 'alice',
      inviteId: 'inv1',
      role: 'participant',
      maxSquares: 10,
      joinedAt: '2025-01-01',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };
    const data = JSON.stringify({
      type: 'participant_added',
      contestId: 'contest-1',
      updatedBy: 'alice',
      timestamp: '2025-01-01',
      participant,
    });

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(addParticipantFromWebSocket).toHaveBeenCalledWith(participant);
    expect(callbacks.onParticipantAdded).toHaveBeenCalledWith(participant);
  });

  it('should not dispatch participant_added when participant is missing', () => {
    const data = JSON.stringify({
      type: 'participant_added',
      contestId: 'contest-1',
      updatedBy: 'alice',
      timestamp: '2025-01-01',
    });

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(addParticipantFromWebSocket).not.toHaveBeenCalled();
    expect(callbacks.onParticipantAdded).not.toHaveBeenCalled();
  });

  it('should handle participant_removed messages', () => {
    const participant = {
      id: 'p2',
      contestId: 'contest-1',
      userId: 'bob',
      inviteId: 'inv2',
      role: 'participant',
      maxSquares: 5,
      joinedAt: '2025-01-01',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };
    const data = JSON.stringify({
      type: 'participant_removed',
      contestId: 'contest-1',
      updatedBy: 'owner1',
      timestamp: '2025-01-01',
      participant,
    });

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(removeParticipantFromWebSocket).toHaveBeenCalledWith('bob');
    expect(callbacks.onParticipantRemoved).toHaveBeenCalledWith(participant);
  });

  it('should not dispatch participant_removed when participant is missing', () => {
    const data = JSON.stringify({
      type: 'participant_removed',
      contestId: 'contest-1',
      updatedBy: 'owner1',
      timestamp: '2025-01-01',
    });

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(removeParticipantFromWebSocket).not.toHaveBeenCalled();
    expect(callbacks.onParticipantRemoved).not.toHaveBeenCalled();
  });

  it('should handle chat_message messages', () => {
    const data = JSON.stringify({
      type: 'chat_message',
      contestId: 'contest-1',
      updatedBy: 'alice',
      timestamp: '2025-01-01T12:00:00Z',
      message: 'Hello!',
    });

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(callbacks.onChatMessage).toHaveBeenCalledWith('alice', 'Hello!', '2025-01-01T12:00:00Z');
  });

  it('should handle connected messages', () => {
    const msg = {
      type: 'connected',
      contestId: 'contest-1',
      updatedBy: 'system',
      timestamp: '2025-01-01',
      connectionId: 'conn-1',
    };
    const data = JSON.stringify(msg);

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(setConnectionDetails).toHaveBeenCalledWith(msg);
  });

  it('should handle disconnected messages', () => {
    const msg = {
      type: 'disconnected',
      contestId: 'contest-1',
      updatedBy: 'system',
      timestamp: '2025-01-01',
    };
    const data = JSON.stringify(msg);

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(setDisconnectionDetails).toHaveBeenCalledWith(msg);
  });

  it('should not call square callback for invalid square_update', () => {
    const data = JSON.stringify({
      type: 'square_update',
      contestId: 'contest-1',
      updatedBy: 'user1',
      timestamp: '2025-01-01',
      square: { id: '' },
    });

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(callbacks.onSquareUpdate).not.toHaveBeenCalled();
  });

  it('should update lastProcessedMessageRef after processing', () => {
    const data = JSON.stringify({
      type: 'connected',
      contestId: 'contest-1',
      updatedBy: 'system',
      timestamp: '2025-01-01',
    });

    contestSocketEventHandler(baseParams({ lastMessage: makeMessage(data) }));
    expect(lastProcessedMessageRef.current).toBe(data);
  });
});
