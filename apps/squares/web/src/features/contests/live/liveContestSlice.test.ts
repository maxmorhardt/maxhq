import { describe, expect, it } from 'vitest';
import {
  makeContest,
  makeParticipant,
  makeQuarterResult,
  makeSquare,
} from '../../../test/fixtures';
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

function live(contest = makeContest(), participants = [makeParticipant()]) {
  const opened = liveContestReducer(undefined, streamOpened('c-1'));
  return receive(opened, event('contest.snapshot', { contest, participants }), 'snap');
}

describe('liveContestSlice stream lifecycle', () => {
  it('starts clean for each contest and resets on close', () => {
    const state = liveContestReducer(live(), streamOpened('c-2'));
    expect(state).toMatchObject({ contestId: 'c-2', contest: null, status: 'connecting' });
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
    const state = live(makeContest({ squares: [makeSquare({ value: 'AB', ownerName: 'Ann' })] }));
    expect(state.contest?.id).toBe('c-1');
    expect(state.participants).toHaveLength(1);
    expect(state.activity.map((a) => a.message)).toContain('Ann claimed square (0, 0)');
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
    expect(state.activity.at(-1)?.message).toBe('Contest status changed to Quarter 1');
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

  it('follows the live score and ignores an older one', () => {
    const newer = { homeScore: 14, updatedAt: '2026-01-01T02:00:00Z' };
    const older = { homeScore: 7, updatedAt: '2026-01-01T01:00:00Z' };
    let state = receive(live(), event('game.updated', newer));
    expect(state.contest?.game?.homeScore).toBe(14);
    state = receive(state, event('game.updated', older), 'e-2');
    expect(state.contest?.game?.homeScore).toBe(14);
  });

  it('adds, updates, and removes participants', () => {
    let state = receive(
      live(),
      event('participant.joined', makeParticipant({ id: 'p-2', userId: 'b@x.com' }))
    );
    expect(state.participants).toHaveLength(2);
    state = receive(
      state,
      event('participant.joined', makeParticipant({ id: 'p-2', userId: 'b@x.com', maxSquares: 9 }))
    );
    expect(state.participants).toHaveLength(2);
    state = receive(state, event('participant.removed', makeParticipant({ userId: 'b@x.com' })));
    expect(state.participants.map((p) => p.userId)).toEqual(['player@x.com']);
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

  it('applies updated contests for this contest only', () => {
    let state = liveContestReducer(
      live(),
      fulfilled('updateContest', makeContest({ visibility: 'public', version: 2 }))
    );
    expect(state.contest?.visibility).toBe('public');
    state = liveContestReducer(
      state,
      fulfilled('updateContest', makeContest({ id: 'other', name: 'X', version: 9 }))
    );
    expect(state.contest?.name).toBe('Test Bowl');
  });

  it('applies participant edits and removals', () => {
    let state = liveContestReducer(
      live(),
      fulfilled('updateParticipant', makeParticipant({ maxSquares: 9 }))
    );
    expect(state.participants[0].maxSquares).toBe(9);
    state = liveContestReducer(
      state,
      fulfilled('removeParticipant', undefined, { contestId: 'c-1', userId: 'player@x.com' })
    );
    expect(state.participants).toHaveLength(0);
  });
});
