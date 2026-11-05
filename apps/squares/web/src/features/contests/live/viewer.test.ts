import { describe, expect, it } from 'vitest';
import { makeContest, makeParticipant, makeSquare } from '../../../test/fixtures';
import { getContestViewer } from './viewer';

const contest = makeContest({
  owner: 'u_owner',
  squares: [
    makeSquare({ id: 'a', owner: 'u_participant' }),
    makeSquare({ id: 'b', owner: 'u_participant' }),
    makeSquare({ id: 'c', owner: 'u_other' }),
  ],
});
const participants = [makeParticipant({ userId: 'u_participant', maxSquares: 5 })];

describe('getContestViewer', () => {
  it('counts a participant’s squares and what they have left', () => {
    expect(getContestViewer('u_participant', contest, participants)).toMatchObject({
      isOwner: false,
      isParticipant: true,
      squaresClaimed: 2,
      squaresLeft: 3,
    });
  });

  it('recognises the owner', () => {
    expect(getContestViewer('u_owner', contest, participants).isOwner).toBe(true);
  });

  it('knows full names only from the roster it was given', () => {
    const roster = [{ userId: 'u_participant', fullName: 'Pat Parker' }];
    const viewer = getContestViewer('u_owner', contest, participants, roster);
    expect(viewer.fullName('u_participant')).toBe('Pat Parker');
    expect(viewer.fullName('u_other')).toBeUndefined();
    expect(viewer.fullName(undefined)).toBeUndefined();
    expect(
      getContestViewer('u_owner', contest, participants).fullName('u_participant')
    ).toBeUndefined();
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
