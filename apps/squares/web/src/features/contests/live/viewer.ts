import type { Contest, Player, PlayerIdentity } from '../../../types/contest';
import { isMe } from '../../profile/useUserId';

// who the signed-in user is in this contest, worked out once and passed down
export interface ContestViewer {
  viewerId: string | undefined;
  isMe: (id: string | undefined) => boolean;
  fullName: (id: string | undefined) => string | undefined;
  player: Player | undefined;
  isOwner: boolean;
  isPlayer: boolean;
  squaresClaimed: number;
  squaresLeft: number;
}

export function getContestViewer(
  viewerId: string | undefined,
  contest: Contest,
  players: Player[],
  roster: PlayerIdentity[] = []
): ContestViewer {
  const mine = (id: string | undefined) => isMe(viewerId, id);
  const player = players.find((p) => mine(p.userId));
  const squaresClaimed = contest.squares.filter((s) => mine(s.owner)).length;
  const fullNames = new Map(roster.map((p) => [p.userId, p.fullName]));

  return {
    viewerId,
    isMe: mine,
    fullName: (id) => (id ? fullNames.get(id) : undefined),
    player,
    isOwner: mine(contest.owner),
    isPlayer: !!player,
    squaresClaimed,
    squaresLeft: Math.max(0, (player?.maxSquares ?? 0) - squaresClaimed),
  };
}
