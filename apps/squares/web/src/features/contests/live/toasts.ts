import type { Contest, Player } from '../../../types/contest';
import { isInGameStatus } from '../../../utils/contestStatus';
import { plural } from '../../../utils/plural';
import { isMe } from '../../profile/useUserId';
import type { ToastSeverity } from '../../toast/toastSlice';
import type { ContestEvent } from './events';
import { isGhost } from './activity';
import { getSquarePool } from './viewer';

interface Before {
  viewerId: string | undefined;
  contest: Contest | null;
  players: Player[];
}

export interface ContestToast {
  message: string;
  severity: ToastSeverity;
}

const STALE_MS = 2 * 60_000;

const isStale = (timestamp: string, now: number) => now - Date.parse(timestamp) > STALE_MS;

export function contestToast(
  event: ContestEvent,
  { viewerId, contest, players }: Before,
  now = Date.now()
): ContestToast | null {
  if (!contest || isMe(viewerId, event.updatedBy) || isStale(event.timestamp, now)) {
    return null;
  }

  switch (event.type) {
    case 'player.joined': {
      const { userId, displayName } = event.data;
      if (
        contest.status !== 'ACTIVE' ||
        !isMe(viewerId, contest.owner) ||
        isMe(viewerId, userId) ||
        players.some((p) => p.userId === userId)
      ) {
        return null;
      }
      return {
        message:
          getSquarePool(contest, players).unallocated > 0
            ? `${displayName} joined. Give them squares to play.`
            : `${displayName} joined. Lower someone’s squares to make room for them.`,
        severity: 'info',
      };
    }

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
      if (isMe(viewerId, winner) || contest.quarterResults?.some((r) => r.quarter === quarter)) {
        return null;
      }
      return {
        message: isGhost(winner)
          ? `No winner for Q${quarter}. Nobody holds that square.`
          : `${winnerName} wins Q${quarter}.`,
        severity: 'info',
      };
    }

    default:
      return null;
  }
}
