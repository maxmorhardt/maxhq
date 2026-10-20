import type {
  ContestSnapshot,
  Game,
  ContestUpdate,
  Participant,
  QuarterResult,
  Square,
} from '../../../types/contest';

// every event on a contest stream shares this envelope; data holds the type's payload
interface Envelope<Type extends string, Data> {
  type: Type;
  contestId: string;
  updatedBy: string;
  timestamp: string;
  data: Data;
}

export type ContestEvent =
  | Envelope<'contest.snapshot', ContestSnapshot>
  | Envelope<'contest.updated', ContestUpdate>
  | Envelope<'contest.deleted', undefined>
  | Envelope<'square.updated', Square>
  | Envelope<'quarter.recorded', QuarterResult>
  | Envelope<'game.updated', Game>
  | Envelope<'participant.joined', Participant>
  | Envelope<'participant.removed', Participant>
  | Envelope<'access.revoked', undefined>;

export type ContestEventType = ContestEvent['type'];

export type ContestEventOf<T extends ContestEventType> = Extract<ContestEvent, { type: T }>;

// a record keyed by the union, so adding an event type without listing it here fails to compile
const KNOWN_TYPES: Record<ContestEventType, true> = {
  'contest.snapshot': true,
  'contest.updated': true,
  'contest.deleted': true,
  'square.updated': true,
  'quarter.recorded': true,
  'game.updated': true,
  'participant.joined': true,
  'participant.removed': true,
  'access.revoked': true,
};

export type ParsedEvent =
  { kind: 'event'; event: ContestEvent } | { kind: 'unknown'; type: string } | { kind: 'invalid' };

// unknown types are skipped so the server can add events before the client knows them
export function parseContestEvent(data: string, contestId: string): ParsedEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return { kind: 'invalid' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { kind: 'invalid' };
  }

  const { type, contestId: eventContestId } = parsed as Partial<ContestEvent>;
  if (typeof type !== 'string' || eventContestId !== contestId) {
    return { kind: 'invalid' };
  }

  if (!(type in KNOWN_TYPES)) {
    return { kind: 'unknown', type };
  }

  return { kind: 'event', event: parsed as ContestEvent };
}
