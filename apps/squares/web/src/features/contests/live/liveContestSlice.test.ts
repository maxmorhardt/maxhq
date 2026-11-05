import { describe, expect, it } from 'vitest';
import { makeContest, makePlayer, makeQuarterResult, makeSquare } from '../../../test/fixtures';
import type { Contest } from '../../../types/contest';
import type { ContestEvent } from './events';
import {
  eventReceived,
  liveContestReducer,
  streamClosed,
  streamEnded,
  streamOpened,
  streamStatusChanged,
  type LiveContestState,
} from './liveContestSlice';

const event = (type: ContestEvent['type'], data?: unknown) =>
  ({
    type,
    contestId: 'c-1',
    updatedBy: 'u',
    timestamp: '2026-01-02T00:00:00Z',
    data,
  }) as ContestEvent;

const receive = (state: LiveContestState, e: ContestEvent, id = 'e-1') =>
  liveContestReducer(state, eventReceived({ id, event: e }));

// what an rtk query mutation dispatches when it succeeds
const fulfilled = (endpointName: string, payload: unknown, originalArgs: unknown = {}) => ({
  type: 'api/executeMutation/fulfilled',
  payload,
  meta: {
    arg: { type: 'mutation', endpointName, originalArgs },
    requestId: 'r',
    requestStatus: 'fulfilled',
  },
});

function live(contest = makeContest(), players = [makePlayer()]) {
  const opened = liveContestReducer(undefined, streamOpened('c-1'));
  return receive(
    opened,
    event('contest.snapshot', { contest, participants: players, viewerId: 'u_player' }),
    'snap'
  );
}

describe('liveContestSlice stream lifecycle', () => {
  it('starts clean for each contest and resets on close', () => {
    const state = liveContestReducer(live(), streamOpened('c-2'));
    expect(state).toMatchObject({
      contestId: 'c-2',
      contest: null,
      viewerId: undefined,
      status: 'connecting',
    });
    expect(liveContestReducer(state, streamClosed()).contestId).toBeNull();
  });

  it('tracks connection status and why it ended', () => {
    let state = liveContestReducer(live(), streamStatusChanged('reconnecting'));
    expect(state.status).toBe('reconnecting');
    state = liveContestReducer(state, streamEnded('forbidden'));
    expect(state.ended).toBe('forbidden');
  });
});

describe('liveContestSlice events', () => {
  it('replaces everything with a snapshot and seeds the feed', () => {
    const state = live(
      makeContest({ squares: [makeSquare({ value: 'AB', owner: 'u_ann', ownerName: 'Ann' })] })
    );
    expect(state.contest?.id).toBe('c-1');
    expect(state.players).toHaveLength(1);
    expect(state.activity.map((a) => a.message)).toContain('Ann claimed square (0, 0)');
    expect(state.viewerId).toBe('u_player');
  });

  it('applies newer square versions and ignores older replays', () => {
    let state = receive(live(), event('square.updated', makeSquare({ value: 'AB', version: 3 })));
    expect(state.contest?.squares[0].value).toBe('AB');

    state = receive(state, event('square.updated', makeSquare({ value: 'ZZ', version: 2 })));
    expect(state.contest?.squares[0].value).toBe('AB');
  });

  it('merges contest updates and logs a status change', () => {
    const state = receive(
      live(),
      event('contest.updated', {
        ...makeContest({ name: 'Renamed', status: 'Q1', version: 2 }),
        squares: undefined,
      })
    );
    expect(state.contest).toMatchObject({ name: 'Renamed', status: 'Q1', version: 2 });
    expect(state.contest?.squares).toHaveLength(9);
    expect(state.activity.at(-1)?.message).toBe('Contest status changed to Q1');
  });

  it('ignores a contest update older than what it holds', () => {
    const state = receive(
      live(makeContest({ version: 5 })),
      event('contest.updated', { ...makeContest({ name: 'Old', version: 4 }) })
    );
    expect(state.contest?.name).toBe('Test Bowl');
  });

  it('records a quarter once and moves the game on', () => {
    const result = makeQuarterResult({ quarter: 1 });
    let state = receive(live(makeContest({ status: 'Q1' })), event('quarter.recorded', result));
    state = receive(state, event('quarter.recorded', result), 'e-2');
    expect(state.contest?.quarterResults).toHaveLength(1);
    expect(state.contest?.status).toBe('Q2');
  });

  it('adds, updates, and removes players', () => {
    let state = receive(
      live(),
      event('participant.joined', makePlayer({ id: 'p-2', userId: 'u_b' }))
    );
    expect(state.players).toHaveLength(2);
    state = receive(
      state,
      event('participant.updated', makePlayer({ id: 'p-2', userId: 'u_b', maxSquares: 9 }))
    );
    expect(state.players).toHaveLength(2);
    expect(state.players.find((p) => p.id === 'p-2')?.maxSquares).toBe(9);
    state = receive(state, event('participant.removed', makePlayer({ userId: 'u_b' })));
    expect(state.players.map((p) => p.userId)).toEqual(['u_player']);
  });

  it('marks the stream ended when the contest is deleted or access is revoked', () => {
    expect(receive(live(), event('contest.deleted')).ended).toBe('deleted');
    expect(receive(live(), event('access.revoked')).ended).toBe('revoked');
  });

  it('ignores grid events before the snapshot arrives', () => {
    const opened = liveContestReducer(undefined, streamOpened('c-1'));
    const state = receive(opened, event('square.updated', makeSquare({ value: 'AB' })));
    expect(state.contest).toBeNull();
  });
});

describe('liveContestSlice contest read', () => {
  const read = (contestId: string, status: Contest['status']) => ({
    type: 'api/executeQuery/fulfilled',
    payload: { contest: makeContest({ status }), participants: [makePlayer()] },
    meta: {
      arg: { type: 'query', endpointName: 'getContest', originalArgs: contestId },
      requestId: 'r',
      requestStatus: 'fulfilled',
    },
  });

  it('loads the contest it read over http, like a snapshot', () => {
    const opened = liveContestReducer(undefined, streamOpened('c-1'));
    const state = liveContestReducer(opened, read('c-1', 'FINISHED'));
    expect(state.contest?.status).toBe('FINISHED');
    expect(state.players).toHaveLength(1);
  });

  it('ignores a read of another contest', () => {
    const opened = liveContestReducer(undefined, streamOpened('c-2'));
    expect(liveContestReducer(opened, read('c-1', 'FINISHED')).contest).toBeNull();
  });
});

describe('liveContestSlice write responses', () => {
  it('applies claimed and cleared squares before their events arrive', () => {
    let state = liveContestReducer(
      live(),
      fulfilled('claimSquare', makeSquare({ value: 'AB', version: 2 }))
    );
    expect(state.contest?.squares[0].value).toBe('AB');
    state = liveContestReducer(
      state,
      fulfilled('claimRandomSquares', {
        squares: [makeSquare({ id: 'sq-0-1', row: 0, col: 1, value: 'AB', version: 2 })],
        requested: 1,
      })
    );
    expect(state.contest?.squares[1].value).toBe('AB');
    state = liveContestReducer(state, fulfilled('clearMySquares', [makeSquare({ version: 3 })]));
    expect(state.contest?.squares[0].value).toBe('');
  });

  it('applies player edits and removals', () => {
    let state = liveContestReducer(
      live(),
      fulfilled('updatePlayer', makePlayer({ maxSquares: 9 }))
    );
    expect(state.players[0].maxSquares).toBe(9);
    state = liveContestReducer(
      state,
      fulfilled('removePlayer', undefined, { contestId: 'c-1', userId: 'u_player' })
    );
    expect(state.players).toHaveLength(0);
  });

  it('applies squares given to everyone at once', () => {
    const newcomer = makePlayer({ id: 'p-2', userId: 'u_new', maxSquares: 0 });
    let state = receive(live(), event('participant.joined', newcomer));
    state = liveContestReducer(state, fulfilled('allotSquares', [{ ...newcomer, maxSquares: 5 }]));
    expect(state.players.find((p) => p.id === 'p-2')?.maxSquares).toBe(5);
  });
});
