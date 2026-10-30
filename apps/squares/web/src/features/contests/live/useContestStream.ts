import { useCallback, useEffect, useEffectEvent, useRef } from 'react';
import { API_BASE_URL } from '../../../api/baseQuery';
import { errorStatus } from '../../../api/errors';
import { openEventStream, type EventStream } from '../../../api/eventStream';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { getIdToken } from '../../../auth/token';
import { isTerminalStatus } from '../../../utils/contestStatus';
import { contestsApi } from '../api';
import { parseContestEvent, type ContestEvent } from './events';
import {
  eventReceived,
  streamClosed,
  streamEnded,
  streamOpened,
  streamStatusChanged,
} from './liveContestSlice';

const SNAPSHOT_TIMEOUT_MS = 4_000;
const REJECTED_STATUSES = new Set([400, 403, 404]);

const endFor = (status: number) => (status === 403 ? 'forbidden' : 'not_found');

// the server ends every way a contest can finish with this, so nothing follows it
const finishes = (event: ContestEvent) =>
  (event.type === 'contest.updated' && isTerminalStatus(event.data.status)) ||
  (event.type === 'contest.snapshot' && isTerminalStatus(event.data.contest.status));

export const contestEventsUrl = (contestId: string) =>
  `${API_BASE_URL}/events/contests/${encodeURIComponent(contestId)}`;

// keeps the live contest in the store in sync with the server; onEvent is for side effects like toasts
export function useContestStream(
  contestId: string | undefined,
  onEvent?: (event: ContestEvent) => void
) {
  const dispatch = useAppDispatch();
  const streamRef = useRef<EventStream | null>(null);
  const notify = useEffectEvent((event: ContestEvent) => onEvent?.(event));

  useEffect(() => {
    if (!contestId) {
      return;
    }

    dispatch(streamOpened(contestId));
    let disposed = false;

    const open = () => {
      const stream = openEventStream({
        url: contestEventsUrl(contestId),
        getToken: getIdToken,
        onStatus: (status) => dispatch(streamStatusChanged(status)),
        // a malformed id is a contest that does not exist
        onRejected: (status) => dispatch(streamEnded(endFor(status))),
        onMessage: ({ id, data }) => {
          const parsed = parseContestEvent(data, contestId);
          if (parsed.kind === 'unknown') {
            return;
          }
          // a garbled event means local state can no longer be trusted, so start over from a snapshot
          if (parsed.kind === 'invalid') {
            stream.reconnect({ resync: true });
            return;
          }

          const { event } = parsed;
          dispatch(eventReceived({ id, event }));
          if (
            event.type === 'contest.deleted' ||
            event.type === 'access.revoked' ||
            finishes(event)
          ) {
            stream.close();
          }
          notify(event);
        },
      });
      streamRef.current = stream;
    };

    // a finished contest is read once; only one still being played holds a stream open
    const request = dispatch(
      contestsApi.endpoints.getContest.initiate(contestId, { subscribe: false, forceRefetch: true })
    );
    request.unwrap().then(
      ({ contest }) => {
        if (!disposed && !isTerminalStatus(contest.status)) {
          open();
        }
      },
      (err: unknown) => {
        if (disposed) {
          return;
        }
        const status = errorStatus(err);
        if (status !== undefined && REJECTED_STATUSES.has(status)) {
          dispatch(streamEnded(endFor(status)));
          return;
        }
        // the stream retries on its own and starts with a snapshot, so it covers a failed read
        open();
      }
    );

    return () => {
      disposed = true;
      streamRef.current?.close();
      streamRef.current = null;
      dispatch(streamClosed());
    };
  }, [contestId, dispatch]);

  // drops local state and starts over from a fresh snapshot, for when a write proves it stale
  const resync = useCallback(() => streamRef.current?.reconnect({ resync: true }), []);

  // data is flowing but the snapshot that opens every stream has not come: ask for it again
  const live = useAppSelector((state) => state.liveContest.status === 'live');
  const loaded = useAppSelector((state) => state.liveContest.contest !== null);
  useEffect(() => {
    if (!contestId || !live || loaded) {
      return;
    }
    const timer = setTimeout(resync, SNAPSHOT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [contestId, live, loaded, resync]);

  return { resync };
}
