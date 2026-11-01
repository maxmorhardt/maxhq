import type { Contest, Participant } from '../../../types/contest';
import { isMe, useMe, type Me } from '../../profile/useMe';

// who the signed-in user is in this contest, worked out once and passed down
export interface ContestViewer {
  me: Me;
  isMe: (id: string | undefined) => boolean;
  participant: Participant | undefined;
  isOwner: boolean;
  isParticipant: boolean;
  squaresClaimed: number;
  squaresLeft: number;
}

export function getContestViewer(
  me: Me,
  contest: Contest,
  participants: Participant[]
): ContestViewer {
  const mine = (id: string | undefined) => isMe(me, id);
  const participant = participants.find((p) => mine(p.userId));
  const squaresClaimed = contest.squares.filter((s) => mine(s.owner)).length;

  return {
    me,
    isMe: mine,
    participant,
    isOwner: mine(contest.owner),
    isParticipant: !!participant,
    squaresClaimed,
    squaresLeft: Math.max(0, (participant?.maxSquares ?? 0) - squaresClaimed),
  };
}

export function useContestViewer(contest: Contest, participants: Participant[]): ContestViewer {
  return getContestViewer(useMe(), contest, participants);
}
