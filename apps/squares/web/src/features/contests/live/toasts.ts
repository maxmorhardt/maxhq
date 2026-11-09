import type { Contest, Player } from '../../../types/contest';
import { isInGameStatus } from '../../../utils/contestStatus';
import { isMe } from '../../profile/useUserId';
import type { ToastSeverity } from '../../toast/toastSlice';
import type { ContestEvent } from './events';

interface Before {
  viewerId: string | undefined;
  contest: Contest | null;
  players: Player[];
}

export interface ContestToast {
  message: string;
  severity: ToastSeverity;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// news the viewer didn't cause, read against the state from before the event
export function contestToast(
  event: ContestEvent,
  { viewerId, contest, players }: Before
): ContestToast | null {
  if (!contest || isMe(viewerId, event.updatedBy)) {
    return null;
  }

  switch (event.type) {
    case 'player.joined':
      if (
        contest.status !== 'ACTIVE' ||
        !isMe(viewerId, contest.owner) ||
        isMe(viewerId, event.data.userId)
      ) {
        return null;
      }
      return {
        message: `${event.data.displayName} joined. Give them squares to play.`,
        severity: 'info',
      };

    case 'player.updated': {
      if (!isMe(viewerId, event.data.userId)) {
        return null;
      }
      const before = players.find((p) => isMe(viewerId, p.userId))?.maxSquares ?? 0;
      const after = event.data.maxSquares;
      if (after === before) {
        return null;
      }
      if (before === 0) {
        return {
          message: `You got ${plural(after, 'square')}. Tap open squares on the board to claim them.`,
          severity: 'success',
        };
      }
      return { message: `The owner changed your squares to ${after}.`, severity: 'info' };
    }

    case 'contest.updated':
      return contest.status === 'ACTIVE' && isInGameStatus(event.data.status)
        ? { message: 'The numbers are drawn. Good luck!', severity: 'info' }
        : null;

    case 'quarter.recorded': {
      const { quarter, winner, winnerName } = event.data;
      if (isMe(viewerId, winner)) {
        return null;
      }
      return {
        message: winner
          ? `${winnerName} wins Q${quarter}.`
          : `Q${quarter} landed on an empty square, so nobody wins it.`,
        severity: 'info',
      };
    }

    default:
      return null;
  }
}
