import type {
  ContestSnapshot,
  ContestUpdate,
  Player,
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
  | Envelope<'player.joined', Player>
  | Envelope<'player.updated', Player>
  | Envelope<'player.removed', Player>
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
  'player.joined': true,
  'player.updated': true,
  'player.removed': true,
  'access.revoked': true,
};

const RENAMED_TYPES: Record<string, ContestEventType> = {
  'participant.joined': 'player.joined',
  'participant.updated': 'player.updated',
  'participant.removed': 'player.removed',
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

  const { type: sentType, contestId: eventContestId } = parsed as Partial<ContestEvent>;
  if (typeof sentType !== 'string' || eventContestId !== contestId) {
    return { kind: 'invalid' };
  }

  const type = Object.hasOwn(RENAMED_TYPES, sentType) ? RENAMED_TYPES[sentType] : sentType;
  if (!Object.hasOwn(KNOWN_TYPES, type)) {
    return { kind: 'unknown', type };
  }

  return { kind: 'event', event: { ...parsed, type } as ContestEvent };
}
