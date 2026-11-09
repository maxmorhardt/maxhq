import { describe, expect, it } from 'vitest';
import { makeContest, makePlayer, makeQuarterResult } from '../../../test/fixtures';
import type { Contest, ContestUpdate, Player } from '../../../types/contest';
import type { ContestEvent } from './events';
import { contestToast } from './toasts';

const event = (type: ContestEvent['type'], data?: unknown, updatedBy = 'u_someone') =>
  ({ type, contestId: 'c-1', updatedBy, timestamp: '', data }) as ContestEvent;

const owned = makeContest({ owner: 'u_me' });
const me = makePlayer({ userId: 'u_me', maxSquares: 0 });

const toast = (e: ContestEvent, contest: Contest | null = owned, players: Player[] = [me]) =>
  contestToast(e, { viewerId: 'u_me', contest, players });

describe('contestToast', () => {
  it('tells the owner when someone joins before kickoff', () => {
    expect(toast(event('player.joined', makePlayer({ displayName: 'Nia N.' })))).toEqual({
      message: 'Nia N. joined. Give them squares to play.',
      severity: 'info',
    });
  });

  it('keeps join news from players and from the owner once the game is on', () => {
    const joined = event('player.joined', makePlayer());
    expect(toast(joined, makeContest())).toBeNull();
    expect(toast(joined, makeContest({ owner: 'u_me', status: 'Q1' }))).toBeNull();
  });

  it('tells a player when the owner first gives them squares', () => {
    expect(toast(event('player.updated', { ...me, maxSquares: 5 }))).toEqual({
      message: 'You got 5 squares. Tap open squares on the board to claim them.',
      severity: 'success',
    });
    expect(toast(event('player.updated', { ...me, maxSquares: 1 }))?.message).toMatch(
      /^You got 1 square\./
    );
  });

  it('tells a player when the owner changes their squares later', () => {
    const holding = makePlayer({ userId: 'u_me', maxSquares: 5 });
    expect(toast(event('player.updated', { ...holding, maxSquares: 3 }), owned, [holding])).toEqual(
      { message: 'The owner changed your squares to 3.', severity: 'info' }
    );
    expect(toast(event('player.updated', holding), owned, [holding])).toBeNull();
  });

  it('ignores changes to other players', () => {
    expect(toast(event('player.updated', makePlayer({ userId: 'u_other' })))).toBeNull();
  });

  it('says when the numbers are drawn', () => {
    const started = event('contest.updated', { status: 'Q1' } as ContestUpdate);
    expect(toast(started)).toEqual({
      message: 'The numbers are drawn. Good luck!',
      severity: 'info',
    });
    expect(toast(started, makeContest({ status: 'Q1' }))).toBeNull();
    expect(toast(event('contest.updated', { status: 'ACTIVE' } as ContestUpdate))).toBeNull();
  });

  it('names who won a quarter when it wasn’t the viewer', () => {
    const won = makeQuarterResult({ quarter: 2, winner: 'u_pat', winnerName: 'Pat P.' });
    expect(toast(event('quarter.recorded', won))).toEqual({
      message: 'Pat P. wins Q2.',
      severity: 'info',
    });
    expect(toast(event('quarter.recorded', { ...won, winner: 'u_me' }))).toBeNull();
  });

  it('says when a quarter lands on an empty square', () => {
    const ghost = makeQuarterResult({ quarter: 4, winner: '', winnerName: '' });
    expect(toast(event('quarter.recorded', ghost))?.message).toBe(
      'Q4 landed on an empty square, so nobody wins it.'
    );
  });

  it('stays quiet about the viewer’s own changes, other events, and before the snapshot', () => {
    expect(toast(event('player.joined', makePlayer(), 'u_me'))).toBeNull();
    expect(toast(event('square.updated', {}))).toBeNull();
    expect(toast(event('player.joined', makePlayer()), null)).toBeNull();
  });
});
