import { describe, expect, it } from 'vitest';
import {
  makeContest,
  makeParticipant,
  makeQuarterResult,
  makeSquare,
} from '../../../test/fixtures';
import { describeEvent, MAX_ACTIVITY, seedActivity, winnerLabel } from './activity';
import type { ContestEvent } from './events';

const event = (type: ContestEvent['type'], data: unknown) =>
  ({
    type,
    contestId: 'c-1',
    updatedBy: 'u',
    timestamp: '2026-01-02T00:00:00Z',
    data,
  }) as ContestEvent;

describe('seedActivity', () => {
  it('rebuilds joins, claims, and winners in time order', () => {
    const contest = makeContest({
      squares: [
        makeSquare({ id: 's1', value: 'AB', ownerName: 'Ann', updatedAt: '2026-01-01T02:00:00Z' }),
        makeSquare({ id: 's2' }),
      ],
      quarterResults: [makeQuarterResult({ createdAt: '2026-01-01T03:00:00Z' })],
    });
    const participants = [
      makeParticipant({ id: 'owner', role: 'owner' }),
      makeParticipant({ id: 'p', userId: 'bo@x.com', joinedAt: '2026-01-01T01:00:00Z' }),
    ];

    expect(seedActivity(contest, participants).map((a) => a.message)).toEqual([
      'bo@x.com joined the contest',
      'Ann claimed square (0, 0)',
      'Q1 winner: Player (7-3)',
    ]);
  });

  it('places a claim when it was made, not when the owner last changed their initials', () => {
    const contest = makeContest({
      squares: [
        makeSquare({
          id: 's1',
          value: 'AB',
          ownerName: 'Ann',
          claimedAt: '2026-01-01T01:00:00Z',
          updatedAt: '2026-01-01T09:00:00Z',
        }),
      ],
      quarterResults: [makeQuarterResult({ createdAt: '2026-01-01T03:00:00Z' })],
    });

    const feed = seedActivity(contest, []);
    expect(feed.map((a) => a.message)).toEqual([
      'Ann claimed square (0, 0)',
      'Q1 winner: Player (7-3)',
    ]);
    expect(feed[0].timestamp).toBe('2026-01-01T01:00:00Z');
  });

  it('keeps only the latest entries', () => {
    const squares = Array.from({ length: MAX_ACTIVITY + 5 }, (_, i) =>
      makeSquare({ id: `s${i}`, value: 'X', updatedAt: new Date(i * 1000).toISOString() })
    );
    expect(seedActivity(makeContest({ squares }), [])).toHaveLength(MAX_ACTIVITY);
  });
});

describe('describeEvent', () => {
  it('describes claims and clears', () => {
    const claimed = event(
      'square.updated',
      makeSquare({ row: 1, col: 2, value: 'AB', ownerName: 'Ann' })
    );
    const cleared = event('square.updated', makeSquare({ row: 1, col: 2 }));
    expect(describeEvent(claimed, 'id')).toMatchObject({
      id: 'id',
      type: 'square_claimed',
      message: 'Ann claimed square (1, 2)',
      timestamp: '2026-01-02T00:00:00Z',
    });
    expect(describeEvent(cleared, 'id')?.message).toBe('Square (1, 2) was cleared');
  });

  it('skips new initials on a held square and a departed player kept in play', () => {
    const renamed = event(
      'square.updated',
      makeSquare({ row: 1, col: 2, value: 'XY', owner: 'ann@x.com', ownerName: 'Ann' })
    );
    expect(
      describeEvent(renamed, 'id', { square: { owner: 'ann@x.com', value: 'AB' } })
    ).toBeNull();

    const ghosted = event('square.updated', makeSquare({ value: 'AB', owner: 'ghost' }));
    expect(
      describeEvent(ghosted, 'id', { square: { owner: 'ann@x.com', value: 'AB' } })
    ).toBeNull();

    // the same square freed and taken by someone else is a real claim
    expect(describeEvent(renamed, 'id', { square: { owner: '', value: '' } })?.type).toBe(
      'square_claimed'
    );
  });

  it('describes quarter results', () => {
    expect(describeEvent(event('quarter.recorded', makeQuarterResult()), 'id')?.message).toBe(
      'Q1 winner: Player (7-3)'
    );
  });

  it('describes a status change but not an edit', () => {
    const update = event('contest.updated', { status: 'Q2' });
    expect(describeEvent(update, 'id', { status: 'Q1' })?.message).toBe(
      'Contest status changed to Quarter 2'
    );
    expect(describeEvent(update, 'id', { status: 'Q2' })).toBeNull();
  });

  it('describes joins and removals', () => {
    const participant = makeParticipant({ userId: 'bo@x.com' });
    expect(describeEvent(event('participant.joined', participant), 'id')?.message).toBe(
      'bo@x.com joined the contest'
    );
    expect(describeEvent(event('participant.removed', participant), 'id')?.message).toBe(
      'bo@x.com was removed'
    );
  });

  it('adds nothing for events without a feed line', () => {
    expect(describeEvent(event('contest.deleted', undefined), 'id')).toBeNull();
  });
});

describe('winnerLabel', () => {
  it('names ghosted winners', () => {
    expect(winnerLabel('ghost', '')).toBe('ghost');
    expect(winnerLabel('a@x.com', 'Ann')).toBe('Ann');
  });
});
