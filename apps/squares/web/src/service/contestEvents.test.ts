import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer, setCurrentContest } from '../features/contests/contestSlice';
import type { Contest, ContestEvent, Participant, QuarterResult, Square } from '../types/contest';
import type { ContestEventCallbacks, StreamFrame } from '../types/events';
import {
  getEventsUrl,
  handleContestEvent,
  parseContestEvent,
  parseFrames,
  StreamHTTPError,
  streamContestEvents,
} from './contestEvents';

const square: Square = {
  id: 'sq1',
  contestId: 'c1',
  row: 1,
  col: 2,
  value: 'AB',
  owner: 'a@b.com',
  ownerName: 'Al',
  version: 2,
  createdAt: '',
  updatedAt: '',
  createdBy: '',
  updatedBy: '',
};

const contest: Contest = {
  id: 'c1',
  name: 'C',
  xLabels: [],
  yLabels: [],
  status: 'ACTIVE',
  visibility: 'public',
  squares: [{ ...square, value: '', owner: '', ownerName: '', version: 1 }],
  quarterResults: [],
  owner: 'o',
  version: 1,
  createdAt: '',
  updatedAt: '',
  createdBy: '',
  updatedBy: '',
};

const participant: Participant = {
  id: 'p1',
  contestId: 'c1',
  userId: 'p@b.com',
  inviteId: 'i1',
  role: 'participant',
  maxSquares: 5,
  joinedAt: '',
  createdAt: '',
  updatedAt: '',
};

const quarterResult: QuarterResult = {
  id: 'q1',
  contestId: 'c1',
  quarter: 1,
  homeTeamScore: 7,
  awayTeamScore: 3,
  winnerRow: 3,
  winnerCol: 7,
  winner: 'a@b.com',
  winnerName: 'Al',
  createdAt: '',
  updatedAt: '',
  createdBy: '',
  updatedBy: '',
};

function event(overrides: Partial<ContestEvent>): ContestEvent {
  return { type: 'square_update', contestId: 'c1', updatedBy: 'u', timestamp: 'now', ...overrides };
}

function setup() {
  const store = configureStore({ reducer: { contest: contestReducer } });
  store.dispatch(setCurrentContest(contest));
  const callbacks: Required<ContestEventCallbacks> = {
    onConnected: vi.fn(),
    onContestDeleted: vi.fn(),
    onRevoked: vi.fn(),
    onError: vi.fn(),
    onSquareUpdate: vi.fn(),
    onQuarterResultUpdate: vi.fn(),
    onQuarterResultRollback: vi.fn(),
    onContestUpdate: vi.fn(),
    onParticipantAdded: vi.fn(),
    onParticipantRemoved: vi.fn(),
  };
  const apply = (e: ContestEvent) =>
    handleContestEvent({ event: e, dispatch: store.dispatch, currentContestId: 'c1', callbacks });
  return { store, callbacks, apply };
}

describe('getEventsUrl', () => {
  it('returns null without a contest id', () => {
    expect(getEventsUrl(undefined)).toBeNull();
  });

  it('builds the encoded stream url', () => {
    expect(getEventsUrl('a b')).toBe('http://localhost:8080/events/contests/a%20b');
  });
});

describe('parseFrames', () => {
  it('parses complete frames and keeps the partial remainder', () => {
    const { frames, rest } = parseFrames(
      'retry: 3000\n\nid: 7\nevent: connected\ndata: {"a":1}\n\n: ping\n\nid: 8\nevent: square_update\ndata: {"b"'
    );

    expect(frames).toEqual([{ id: '7', event: 'connected', data: '{"a":1}' }]);
    expect(rest).toBe('id: 8\nevent: square_update\ndata: {"b"');
  });

  it('handles crlf line endings, multi-line data, and frames without an id or event', () => {
    const { frames } = parseFrames('data: one\r\ndata: two\r\n\r\nid\ndata:x\n\n');

    expect(frames).toEqual([
      { id: null, event: 'message', data: 'one\ntwo' },
      { id: '', event: 'message', data: 'x' },
    ]);
  });
});

describe('parseContestEvent', () => {
  it('accepts well-formed events', () => {
    expect(parseContestEvent(JSON.stringify(event({})))?.type).toBe('square_update');
  });

  it('rejects malformed json and incomplete events', () => {
    expect(parseContestEvent('{')).toBeNull();
    expect(parseContestEvent('"string"')).toBeNull();
    expect(parseContestEvent(JSON.stringify({ type: 'square_update' }))).toBeNull();
  });
});

describe('streamContestEvents', () => {
  const originalFetch = globalThis.fetch;

  function bodyOf(chunks: string[]) {
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
        controller.close();
      },
    });
  }

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends the token and last event id, then delivers frames split across reads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        bodyOf(['id: 1\nevent: connected\nda', 'ta: {}\n\nid: 2\nevent: x\ndata: y\n\n']),
        {
          status: 200,
        }
      )
    );
    globalThis.fetch = fetchMock;
    const frames: StreamFrame[] = [];
    const onOpen = vi.fn();

    await streamContestEvents({
      url: 'http://x/events/contests/c1',
      token: 'tok',
      lastEventId: '41',
      signal: new AbortController().signal,
      onOpen,
      onFrame: (f) => frames.push(f),
    });

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok');
    expect(headers['Last-Event-ID']).toBe('41');
    expect(headers.Accept).toBe('text/event-stream');
    expect(onOpen).toHaveBeenCalledOnce();
    expect(frames.map((f) => f.id)).toEqual(['1', '2']);
  });

  it('omits Last-Event-ID on a fresh connection and rejects non-2xx answers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('nope', { status: 403 }));
    globalThis.fetch = fetchMock;

    const err = await streamContestEvents({
      url: 'http://x',
      token: 'tok',
      lastEventId: null,
      signal: new AbortController().signal,
      onFrame: vi.fn(),
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(StreamHTTPError);
    expect((err as StreamHTTPError).status).toBe(403);
    expect(fetchMock.mock.calls[0][1].headers['Last-Event-ID']).toBeUndefined();
  });
});

describe('handleContestEvent', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('applies the connected snapshot', () => {
    const { store, callbacks, apply } = setup();
    const snapshot = { ...contest, name: 'Snapshot' };

    apply(event({ type: 'connected', contest: snapshot, participants: [participant] }));

    expect(store.getState().contest.currentContest?.name).toBe('Snapshot');
    expect(store.getState().contest.participants).toEqual([participant]);
    expect(callbacks.onConnected).toHaveBeenCalledWith(snapshot, [participant]);
  });

  it('reports revoked access', () => {
    const { callbacks, apply } = setup();

    apply(event({ type: 'revoked' }));

    expect(callbacks.onRevoked).toHaveBeenCalled();
  });

  it('ignores events for another contest', () => {
    const { callbacks, apply } = setup();

    apply(event({ contestId: 'other', square }));

    expect(callbacks.onSquareUpdate).not.toHaveBeenCalled();
  });

  it('applies square updates and ignores ones older than what is held', () => {
    const { store, callbacks, apply } = setup();

    apply(event({ square }));
    expect(store.getState().contest.currentContest?.squares[0].value).toBe('AB');
    expect(callbacks.onSquareUpdate).toHaveBeenCalledWith('AB', 1, 2, 'Al');

    apply(event({ square: { ...square, value: 'OLD', version: 1 } }));
    expect(store.getState().contest.currentContest?.squares[0].value).toBe('AB');

    apply(event({ square: undefined }));
    expect(callbacks.onSquareUpdate).toHaveBeenCalledTimes(2);
  });

  it('applies contest updates including the new version', () => {
    const { store, callbacks, apply } = setup();

    apply(event({ type: 'contest_update', contest: { ...contest, status: 'Q1', version: 5 } }));

    expect(store.getState().contest.currentContest?.status).toBe('Q1');
    expect(store.getState().contest.currentContest?.version).toBe(5);
    expect(callbacks.onContestUpdate).toHaveBeenCalledWith('Q1');
  });

  it('applies quarter results and rollbacks', () => {
    const { store, callbacks, apply } = setup();

    apply(event({ type: 'quarter_result_update', quarterResult }));
    expect(store.getState().contest.currentContest?.quarterResults).toHaveLength(1);
    expect(callbacks.onQuarterResultUpdate).toHaveBeenCalledWith(1, 'Al', 7, 3, 3, 7, 'a@b.com');

    apply(
      event({
        type: 'quarter_result_rollback',
        quarterResult,
        contest: { ...contest, status: 'Q1' },
      })
    );
    expect(store.getState().contest.currentContest?.quarterResults).toHaveLength(0);
    expect(callbacks.onQuarterResultRollback).toHaveBeenCalledWith(1, 'Al');
  });

  it('notifies about deletion and participant changes', () => {
    const { store, callbacks, apply } = setup();

    apply(event({ type: 'participant_added', participant }));
    expect(store.getState().contest.participants).toContainEqual(participant);
    expect(callbacks.onParticipantAdded).toHaveBeenCalledWith(participant);

    apply(event({ type: 'participant_removed', participant }));
    expect(store.getState().contest.participants).not.toContainEqual(participant);
    expect(callbacks.onParticipantRemoved).toHaveBeenCalledWith(participant);

    apply(event({ type: 'participant_added' }));
    apply(event({ type: 'participant_removed' }));
    expect(callbacks.onParticipantAdded).toHaveBeenCalledOnce();

    apply(event({ type: 'contest_deleted' }));
    expect(callbacks.onContestDeleted).toHaveBeenCalled();
  });

  it('skips incomplete updates and logs unknown types', () => {
    const { callbacks, apply } = setup();

    apply(event({ type: 'contest_update' }));
    apply(event({ type: 'quarter_result_update' }));
    apply(event({ type: 'quarter_result_rollback' }));
    apply(event({ type: 'mystery' as ContestEvent['type'] }));

    expect(callbacks.onContestUpdate).not.toHaveBeenCalled();
    expect(callbacks.onQuarterResultUpdate).not.toHaveBeenCalled();
    expect(callbacks.onQuarterResultRollback).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });
});
