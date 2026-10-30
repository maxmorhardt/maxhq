import { useCallback, useEffect, useEffectEvent, useRef } from 'react';
import { API_BASE_URL } from '../../../api/baseQuery';
import { errorStatus } from '../../../api/errors';
import { openEventStream, type EventStream } from '../../../api/eventStream';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { getIdToken } from '../../../auth/token';
import { isTerminalStatus } from '../../../utils/contestStatus';
import { contestsApi } from '../api';
import { parseContestEvent, type ContestEvent } from './events';
import { selectListedStatus } from './selectors';
import {
  eventReceived,
  streamClosed,
  streamEnded,
  streamOpened,
  streamStatusChanged,
} from './liveContestSlice';

const SNAPSHOT_TIMEOUT_MS = 4_000;
// realtime turns away a finished contest, which has nothing left to stream
const FINISHED_STATUS = 410;

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
  const rereadRef = useRef<(() => void) | null>(null);
  const notify = useEffectEvent((event: ContestEvent) => onEvent?.(event));
  const listed = useAppSelector((state) => selectListedStatus(state, contestId));
  const listedAsFinished = useEffectEvent(() => isTerminalStatus(listed));

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
        onRejected: (status) => {
          if (status === FINISHED_STATUS) {
            streamRef.current = null;
            read(false);
            return;
          }
          // a malformed id is a contest that does not exist
          dispatch(streamEnded(endFor(status)));
        },
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

    // a finished contest is read once over http; the getContest matcher puts it in the store
    const read = (fallBackToStream: boolean) => {
      rereadRef.current = () => read(false);
      dispatch(streamStatusChanged('connecting'));
      dispatch(
        contestsApi.endpoints.getContest.initiate(contestId, {
          subscribe: false,
          forceRefetch: true,
        })
      )
        .unwrap()
        .catch((err: unknown) => {
          if (disposed) {
            return;
          }
          // the list's status was only a hint, so the stream gets the final say
          if (fallBackToStream) {
            open();
            return;
          }
          const status = errorStatus(err);
          if (status === 403 || status === 404) {
            dispatch(streamEnded(endFor(status)));
          } else {
            dispatch(streamStatusChanged('failed'));
          }
        });
    };

    if (listedAsFinished()) {
      read(true);
    } else {
      open();
    }

    return () => {
      disposed = true;
      streamRef.current?.close();
      streamRef.current = null;
      rereadRef.current = null;
      dispatch(streamClosed());
    };
  }, [contestId, dispatch]);

  // drops local state and starts over from a fresh snapshot, for when a write proves it stale
  const resync = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.reconnect({ resync: true });
    } else {
      rereadRef.current?.();
    }
  }, []);

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
