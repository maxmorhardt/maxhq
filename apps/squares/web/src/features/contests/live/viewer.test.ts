import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { makeContest, makeParticipant, makeSquare } from '../../../test/fixtures';
import { mockAuth } from '../../../test/auth';
import { getContestViewer, useContestViewer } from './viewer';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../profile/api', () => ({
  useGetMyProfileQuery: vi.fn(() => ({ data: { userId: 'u_player' } })),
}));

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
    expect(getContestViewer({ userId: 'u_player' }, contest, participants)).toMatchObject({
      isOwner: false,
      isParticipant: true,
      squaresClaimed: 2,
      squaresLeft: 3,
    });
  });

  it('recognises the owner', () => {
    expect(getContestViewer({ userId: 'u_owner' }, contest, participants).isOwner).toBe(true);
  });

  it('treats a signed-out or unknown viewer as a spectator', () => {
    const viewer = getContestViewer({}, contest, participants);
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

describe('useContestViewer', () => {
  it('uses the signed-in user id from the profile', () => {
    mockAuth({ email: 'player@x.com' });
    const { result } = renderHook(() => useContestViewer(contest, participants));
    expect(result.current.me).toEqual({ userId: 'u_player' });
    expect(result.current.squaresClaimed).toBe(2);
  });
});
