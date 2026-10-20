import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { makeContest, makeParticipant, makeSquare } from '../../../test/fixtures';
import { mockAuth } from '../../../test/auth';
import { getContestViewer, useContestViewer } from './viewer';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

const contest = makeContest({
  owner: 'owner@x.com',
  squares: [
    makeSquare({ id: 'a', owner: 'player@x.com' }),
    makeSquare({ id: 'b', owner: 'player@x.com' }),
    makeSquare({ id: 'c', owner: 'other@x.com' }),
  ],
});
const participants = [makeParticipant({ userId: 'player@x.com', maxSquares: 5 })];

describe('getContestViewer', () => {
  it('counts a participant’s squares and what they have left', () => {
    expect(getContestViewer('player@x.com', contest, participants)).toMatchObject({
      isOwner: false,
      isParticipant: true,
      squaresClaimed: 2,
      squaresLeft: 3,
    });
  });

  it('recognises the owner', () => {
    expect(getContestViewer('owner@x.com', contest, participants).isOwner).toBe(true);
  });

  it('treats a signed-out or unknown viewer as a spectator', () => {
    expect(getContestViewer(undefined, contest, participants)).toMatchObject({
      isOwner: false,
      isParticipant: false,
      squaresClaimed: 0,
      squaresLeft: 0,
    });
  });
});

describe('useContestViewer', () => {
  it('uses the signed-in email', () => {
    mockAuth({ email: 'player@x.com' });
    const { result } = renderHook(() => useContestViewer(contest, participants));
    expect(result.current.email).toBe('player@x.com');
  });
});
