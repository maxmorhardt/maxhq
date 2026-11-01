import type { Contest, Participant } from '../../../types/contest';
import { isMe } from '../../profile/useUserId';

// who the signed-in user is in this contest, worked out once and passed down
export interface ContestViewer {
  viewerId: string | undefined;
  isMe: (id: string | undefined) => boolean;
  participant: Participant | undefined;
  isOwner: boolean;
  isParticipant: boolean;
  squaresClaimed: number;
  squaresLeft: number;
}

export function getContestViewer(
  viewerId: string | undefined,
  contest: Contest,
  participants: Participant[]
): ContestViewer {
  const mine = (id: string | undefined) => isMe(viewerId, id);
  const participant = participants.find((p) => mine(p.userId));
  const squaresClaimed = contest.squares.filter((s) => mine(s.owner)).length;

  return {
    viewerId,
    isMe: mine,
    participant,
    isOwner: mine(contest.owner),
    isParticipant: !!participant,
    squaresClaimed,
    squaresLeft: Math.max(0, (participant?.maxSquares ?? 0) - squaresClaimed),
  };
}
