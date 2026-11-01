import type { Contest, Participant, ParticipantIdentity } from '../../../types/contest';
import { isMe } from '../../profile/useUserId';

// who the signed-in user is in this contest, worked out once and passed down
export interface ContestViewer {
  viewerId: string | undefined;
  isMe: (id: string | undefined) => boolean;
  fullName: (id: string | undefined) => string | undefined;
  participant: Participant | undefined;
  isOwner: boolean;
  isParticipant: boolean;
  squaresClaimed: number;
  squaresLeft: number;
}

export function getContestViewer(
  viewerId: string | undefined,
  contest: Contest,
  participants: Participant[],
  roster: ParticipantIdentity[] = []
): ContestViewer {
  const mine = (id: string | undefined) => isMe(viewerId, id);
  const participant = participants.find((p) => mine(p.userId));
  const squaresClaimed = contest.squares.filter((s) => mine(s.owner)).length;
  const fullNames = new Map(roster.map((p) => [p.userId, p.fullName]));

  return {
    viewerId,
    isMe: mine,
    fullName: (id) => (id ? fullNames.get(id) : undefined),
    participant,
    isOwner: mine(contest.owner),
    isParticipant: !!participant,
    squaresClaimed,
    squaresLeft: Math.max(0, (participant?.maxSquares ?? 0) - squaresClaimed),
  };
}
