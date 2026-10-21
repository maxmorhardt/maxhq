import type {
  ActivityEvent,
  Contest,
  ContestStatus,
  Participant,
  Square,
} from '../../../types/contest';
import { getStatusLabel } from '../../../utils/contestStatus';
import type { ContestEvent } from './events';

// the feed keeps the latest entries so a long game cannot grow it without bound
export const MAX_ACTIVITY = 200;

// a ghosted square (owner left a private contest) keeps its value but has no owner name
const GHOST_USER = 'ghost';

export const winnerLabel = (winner: string, winnerName: string) =>
  winner === GHOST_USER ? 'ghost' : winnerName;

const byTime = (a: ActivityEvent, b: ActivityEvent) =>
  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();

// rebuilds the feed from a snapshot, so a fresh viewer sees what already happened
export function seedActivity(contest: Contest, participants: Participant[]): ActivityEvent[] {
  const joined = participants
    .filter((p) => p.role !== 'owner')
    .map<ActivityEvent>((p) => ({
      id: `seed-participant-${p.id}`,
      type: 'participant_added',
      message: `${p.userId} joined the contest`,
      timestamp: p.joinedAt || p.createdAt,
    }));

  const claimed = contest.squares
    .filter((s) => s.value.trim() !== '')
    .map<ActivityEvent>((s) => ({
      id: `seed-square-${s.id}`,
      type: 'square_claimed',
      message: `${s.ownerName || 'Someone'} claimed square (${s.row}, ${s.col})`,
      timestamp: s.claimedAt || s.updatedAt || s.createdAt,
    }));

  const winners = (contest.quarterResults ?? []).map<ActivityEvent>((qr) => ({
    id: `seed-qr-${qr.id}`,
    type: 'quarter_winner',
    message: `Q${qr.quarter} winner: ${winnerLabel(qr.winner, qr.winnerName)} (${qr.homeTeamScore}-${qr.awayTeamScore})`,
    timestamp: qr.createdAt,
  }));

  return [...joined, ...claimed, ...winners].sort(byTime).slice(-MAX_ACTIVITY);
}

// what the contest looked like before the event, to tell real changes from edits
export interface Before {
  status?: ContestStatus;
  square?: Pick<Square, 'owner' | 'value'>;
}

// the feed line an event adds
export function describeEvent(
  event: ContestEvent,
  id: string,
  before: Before = {}
): ActivityEvent | null {
  const entry = (type: ActivityEvent['type'], message: string): ActivityEvent => ({
    id,
    type,
    message,
    timestamp: event.timestamp,
  });

  switch (event.type) {
    case 'square.updated': {
      const { row, col, value, owner, ownerName } = event.data;
      if (value.trim() === '') {
        return entry('square_cleared', `Square (${row}, ${col}) was cleared`);
      }
      // new initials on a held square, or a departed player's square kept in play, are not claims
      const held = before.square && before.square.value.trim() !== '';
      if (owner === GHOST_USER || (held && before.square?.owner === owner)) {
        return null;
      }
      return entry('square_claimed', `${ownerName} claimed square (${row}, ${col})`);
    }
    case 'quarter.recorded': {
      const qr = event.data;
      return entry(
        'quarter_winner',
        `Q${qr.quarter} winner: ${winnerLabel(qr.winner, qr.winnerName)} (${qr.homeTeamScore}-${qr.awayTeamScore})`
      );
    }
    case 'contest.updated':
      return before.status && event.data.status !== before.status
        ? entry('contest_status', `Contest status changed to ${getStatusLabel(event.data.status)}`)
        : null;
    case 'participant.joined':
      return entry('participant_added', `${event.data.userId} joined the contest`);
    case 'participant.removed':
      return entry('participant_removed', `${event.data.userId} was removed`);
    default:
      return null;
  }
}
