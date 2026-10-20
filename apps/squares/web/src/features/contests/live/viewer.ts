import { useAuth } from 'react-oidc-context';
import type { Contest, Participant } from '../../../types/contest';

// who the signed-in user is in this contest, worked out once and passed down
export interface ContestViewer {
  email: string | undefined;
  participant: Participant | undefined;
  isOwner: boolean;
  isParticipant: boolean;
  squaresClaimed: number;
  squaresLeft: number;
}

export function getContestViewer(
  email: string | undefined,
  contest: Contest,
  participants: Participant[]
): ContestViewer {
  const participant = email ? participants.find((p) => p.userId === email) : undefined;
  const squaresClaimed = email ? contest.squares.filter((s) => s.owner === email).length : 0;

  return {
    email,
    participant,
    isOwner: !!email && email === contest.owner,
    isParticipant: !!participant,
    squaresClaimed,
    squaresLeft: Math.max(0, (participant?.maxSquares ?? 0) - squaresClaimed),
  };
}

export function useContestViewer(contest: Contest, participants: Participant[]): ContestViewer {
  const email = useAuth().user?.profile?.email;
  return getContestViewer(email, contest, participants);
}
