import { describe, expect, it } from 'vitest';
import { makeContest, makeParticipant, makeSquare } from '../../../test/fixtures';
import { getContestViewer } from './viewer';

const contest = makeContest({
  owner: 'u_owner',
  squares: [
    makeSquare({ id: 'a', owner: 'u_player' }),
    makeSquare({ id: 'b', owner: 'u_player' }),
    makeSquare({ id: 'c', owner: 'u_other' }),
  ],
});
const participants = [makeParticipant({ userId: 'u_player', maxSquares: 5 })];

describe('getContestViewer', () => {
  it('counts a participant’s squares and what they have left', () => {
    expect(getContestViewer('u_player', contest, participants)).toMatchObject({
      isOwner: false,
      isParticipant: true,
      squaresClaimed: 2,
      squaresLeft: 3,
    });
  });

  it('recognises the owner', () => {
    expect(getContestViewer('u_owner', contest, participants).isOwner).toBe(true);
  });

  it('treats a signed-out or unknown viewer as a spectator', () => {
    const viewer = getContestViewer(undefined, contest, participants);
    expect(viewer).toMatchObject({
      isOwner: false,
      isParticipant: false,
      squaresClaimed: 0,
      squaresLeft: 0,
    });
    expect(viewer.isMe(undefined)).toBe(false);
    expect(viewer.isMe('')).toBe(false);
  });
});
