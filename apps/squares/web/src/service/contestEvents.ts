import {
  addParticipantFromEvent,
  removeParticipantFromEvent,
  rollbackQuarterResultFromEvent,
  setCurrentContest,
  setParticipants,
  updateContestFromEvent,
  updateQuarterResultFromEvent,
  updateSquareFromEvent,
} from '../features/contests/contestSlice';
import type { Contest, ContestEvent, QuarterResult, Square } from '../types/contest';
import type { HandleContestEventParams, StreamFrame } from '../types/events';

export function getEventsUrl(id: string | undefined) {
  if (!id) {
    return null;
  }

  const baseURL = import.meta.env.PROD
    ? 'https://api.maxstash.io/squares'
    : 'http://localhost:8080';
  return `${baseURL}/events/contests/${encodeURIComponent(id)}`;
}

// a non-2xx answer to the stream request; the status says whether reconnecting can help
export class StreamHTTPError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Event stream request failed with status ${status}`);
    this.name = 'StreamHTTPError';
    this.status = status;
  }
}

interface StreamOptions {
  url: string;
  token: string;
  lastEventId: string | null;
  signal: AbortSignal;
  onOpen?: () => void;
  onFrame: (frame: StreamFrame) => void;
}

export async function streamContestEvents({
  url,
  token,
  lastEventId,
  signal,
  onOpen,
  onFrame,
}: StreamOptions): Promise<void> {
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    Authorization: `Bearer ${token}`,
  };
  if (lastEventId) {
    headers['Last-Event-ID'] = lastEventId;
  }

  const response = await fetch(url, { headers, signal, cache: 'no-store' });
  if (!response.ok || !response.body) {
    throw new StreamHTTPError(response.status);
  }

  onOpen?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // resolves when the server ends the stream; the caller decides whether to reconnect
  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      return;
    }

    buffer += decoder.decode(value, { stream: true });
    const { frames, rest } = parseFrames(buffer);
    buffer = rest;
    frames.forEach(onFrame);
  }
}

// splits buffered text into complete server-sent event frames, keeping any partial frame for the next read
export function parseFrames(text: string): { frames: StreamFrame[]; rest: string } {
  const normalized = text.replace(/\r\n?/g, '\n');
  const blocks = normalized.split('\n\n');
  const rest = blocks.pop() ?? '';

  const frames: StreamFrame[] = [];
  for (const block of blocks) {
    let id: string | null = null;
    let event = 'message';
    const data: string[] = [];

    for (const line of block.split('\n')) {
      // comment lines are heartbeats
      if (line === '' || line.startsWith(':')) {
        continue;
      }

      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');

      if (field === 'id') {
        id = value;
      } else if (field === 'event') {
        event = value;
      } else if (field === 'data') {
        data.push(value);
      }
    }

    if (data.length > 0) {
      frames.push({ id, event, data: data.join('\n') });
    }
  }

  return { frames, rest };
}

export function parseContestEvent(data: string): ContestEvent | null {
  try {
    const parsed: unknown = JSON.parse(data);
    return isValidContestEvent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// applies one contest event to the store and notifies the page
export function handleContestEvent({
  event,
  dispatch,
  currentContestId,
  callbacks,
}: HandleContestEventParams) {
  // the snapshot replaces whatever the page held, so it is applied before the contest check
  if (event.type === 'connected') {
    if (event.contest) {
      dispatch(setCurrentContest(event.contest));
    }
    if (event.participants) {
      dispatch(setParticipants(event.participants));
    }
    if (event.contest && event.participants) {
      callbacks?.onConnected?.(event.contest, event.participants);
    }
    return;
  }

  if (event.type === 'revoked') {
    callbacks?.onRevoked?.();
    return;
  }

  if (event.contestId !== currentContestId) {
    console.warn('Received event for different contest:', event.contestId);
    return;
  }

  switch (event.type) {
    case 'square_update':
      if (isValidSquareUpdate(event)) {
        dispatch(updateSquareFromEvent(event.square));
        callbacks?.onSquareUpdate?.(
          event.square.value,
          event.square.row,
          event.square.col,
          event.square.ownerName
        );
      }
      break;

    case 'contest_update':
      if (isValidContestUpdate(event)) {
        dispatch(
          updateContestFromEvent({
            xLabels: event.contest.xLabels,
            yLabels: event.contest.yLabels,
            homeTeam: event.contest.homeTeam,
            awayTeam: event.contest.awayTeam,
            status: event.contest.status,
            visibility: event.contest.visibility,
            gameId: event.contest.gameId,
            game: event.contest.game,
            version: event.contest.version,
          })
        );
        callbacks?.onContestUpdate?.(event.contest.status);
      }
      break;

    case 'quarter_result_update':
      if (isValidQuarterResultUpdate(event)) {
        dispatch(
          updateQuarterResultFromEvent({
            quarter: event.quarterResult.quarter,
            homeTeamScore: event.quarterResult.homeTeamScore,
            awayTeamScore: event.quarterResult.awayTeamScore,
            winnerRow: event.quarterResult.winnerRow,
            winnerCol: event.quarterResult.winnerCol,
            winner: event.quarterResult.winner,
            winnerName: event.quarterResult.winnerName,
          })
        );
        callbacks?.onQuarterResultUpdate?.(
          event.quarterResult.quarter,
          event.quarterResult.winnerName,
          event.quarterResult.homeTeamScore,
          event.quarterResult.awayTeamScore,
          event.quarterResult.winnerRow,
          event.quarterResult.winnerCol,
          event.quarterResult.winner
        );
      }
      break;

    case 'quarter_result_rollback':
      if (isValidQuarterResultRollback(event)) {
        dispatch(
          rollbackQuarterResultFromEvent({
            quarter: event.quarterResult.quarter,
            status: event.contest?.status,
          })
        );
        callbacks?.onQuarterResultRollback?.(
          event.quarterResult.quarter,
          event.quarterResult.winnerName
        );
      }
      break;

    case 'contest_deleted':
      callbacks?.onContestDeleted?.();
      break;

    case 'participant_added':
      if (event.participant) {
        dispatch(addParticipantFromEvent(event.participant));
        callbacks?.onParticipantAdded?.(event.participant);
      }
      break;

    case 'participant_removed':
      if (event.participant) {
        dispatch(removeParticipantFromEvent(event.participant.userId));
        callbacks?.onParticipantRemoved?.(event.participant);
      }
      break;

    default:
      console.error('Unknown contest event type:', (event as ContestEvent).type);
      break;
  }
}

function isValidContestEvent(data: unknown): data is ContestEvent {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const event = data as ContestEvent;
  return (
    typeof event.type === 'string' &&
    typeof event.contestId === 'string' &&
    typeof event.timestamp === 'string' &&
    typeof event.updatedBy === 'string'
  );
}

function isValidSquareUpdate(event: ContestEvent): event is ContestEvent & { square: Square } {
  return event.type === 'square_update' && !!event.square?.id && event.square.value !== undefined;
}

function isValidContestUpdate(event: ContestEvent): event is ContestEvent & { contest: Contest } {
  return event.type === 'contest_update' && !!event.contest;
}

function isValidQuarterResultUpdate(
  event: ContestEvent
): event is ContestEvent & { quarterResult: QuarterResult } {
  return event.type === 'quarter_result_update' && !!event.quarterResult;
}

function isValidQuarterResultRollback(
  event: ContestEvent
): event is ContestEvent & { quarterResult: QuarterResult } {
  return event.type === 'quarter_result_rollback' && !!event.quarterResult;
}
