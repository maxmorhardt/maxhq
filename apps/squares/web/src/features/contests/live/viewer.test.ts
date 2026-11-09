import { describe, expect, it } from 'vitest';
import { makeContest, makePlayer, makeSquare } from '../../../test/fixtures';
import { getContestViewer, getOwnerTodo, getSquarePool } from './viewer';

const contest = makeContest({
  owner: 'u_owner',
  squares: [
    makeSquare({ id: 'a', owner: 'u_player' }),
    makeSquare({ id: 'b', owner: 'u_player' }),
    makeSquare({ id: 'c', owner: 'u_other' }),
  ],
});
const players = [makePlayer({ userId: 'u_player', maxSquares: 5 })];

describe('getContestViewer', () => {
  it('counts a player’s squares and what they have left', () => {
    expect(getContestViewer('u_player', contest, players)).toMatchObject({
      isOwner: false,
      isPlayer: true,
      squaresClaimed: 2,
      squaresLeft: 3,
    });
  });

  it('recognises the owner', () => {
    expect(getContestViewer('u_owner', contest, players).isOwner).toBe(true);
  });

  it('knows full names only from the roster it was given', () => {
    const roster = [{ userId: 'u_player', fullName: 'Pat Parker' }];
    const viewer = getContestViewer('u_owner', contest, players, roster);
    expect(viewer.fullName('u_player')).toBe('Pat Parker');
    expect(viewer.fullName('u_other')).toBeUndefined();
    expect(viewer.fullName(undefined)).toBeUndefined();
    expect(getContestViewer('u_owner', contest, players).fullName('u_player')).toBeUndefined();
  });

  it('treats a signed-out or unknown viewer as a spectator', () => {
    const viewer = getContestViewer(undefined, contest, players);
    expect(viewer).toMatchObject({
      isOwner: false,
      isPlayer: false,
      squaresClaimed: 0,
      squaresLeft: 0,
    });
    expect(viewer.isMe(undefined)).toBe(false);
    expect(viewer.isMe('')).toBe(false);
  });
});

describe('getSquarePool', () => {
  const board = makeContest({}, 10);

  it('counts what is given out and who still waits for squares', () => {
    const players = [
      makePlayer({ id: 'o', userId: 'u_owner', role: 'owner', maxSquares: 0 }),
      makePlayer({ id: 'a', userId: 'u_a', maxSquares: 30 }),
      makePlayer({ id: 'b', userId: 'u_b', maxSquares: 0 }),
    ];
    const pool = getSquarePool(board, players);
    expect(pool.allocated).toBe(30);
    expect(pool.unallocated).toBe(70);
    expect(pool.waiting.map((p) => p.id)).toEqual(['b']);
  });

  it('never reports a negative number left', () => {
    const pool = getSquarePool(board, [makePlayer({ maxSquares: 105 })]);
    expect(pool.unallocated).toBe(0);
  });
});

describe('getOwnerTodo', () => {
  const owner = makePlayer({ id: 'o', userId: 'u_owner', role: 'owner', maxSquares: 5 });
  const board = makeContest();

  it('starts with inviting players', () => {
    expect(getOwnerTodo(board, [owner])).toBe('invite');
  });

  it('asks for squares while someone waits or squares are left over', () => {
    expect(getOwnerTodo(board, [owner, makePlayer({ maxSquares: 0 })])).toBe('squares');
    expect(getOwnerTodo(board, [owner, makePlayer({ maxSquares: 3 })])).toBe('squares');
  });

  it('waits on the board to fill once every square is handed out', () => {
    expect(getOwnerTodo(board, [owner, makePlayer({ maxSquares: 4 })])).toBe('fill');
  });

  it('is done once the board is full or the game is on', () => {
    const full = makeContest({ squares: [makeSquare({ value: 'AB' })] });
    expect(getOwnerTodo(full, [owner, makePlayer({ maxSquares: 0 })])).toBeNull();
    expect(getOwnerTodo(makeContest({ status: 'Q1' }), [owner])).toBeNull();
  });
});
