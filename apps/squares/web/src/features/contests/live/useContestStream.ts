import { useCallback, useEffect, useEffectEvent, useRef } from 'react';
import { API_BASE_URL } from '../../../api/baseQuery';
import { openEventStream, type EventStream } from '../../../api/eventStream';
import { useAppDispatch } from '../../../app/hooks';
import { getIdToken } from '../../../auth/token';
import { parseContestEvent, type ContestEvent } from './events';
import {
  eventReceived,
  streamClosed,
  streamEnded,
  streamOpened,
  streamStatusChanged,
} from './liveContestSlice';

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

    const stream = openEventStream({
      url: contestEventsUrl(contestId),
      getToken: getIdToken,
      onStatus: (status) => dispatch(streamStatusChanged(status)),
      // a malformed id is a contest that does not exist
      onRejected: (status) => dispatch(streamEnded(status === 403 ? 'forbidden' : 'not_found')),
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
        if (event.type === 'contest.deleted' || event.type === 'access.revoked') {
          stream.close();
        }
        notify(event);
      },
    });
    streamRef.current = stream;

    return () => {
      stream.close();
      streamRef.current = null;
      dispatch(streamClosed());
    };
  }, [contestId, dispatch]);

  // drops local state and starts over from a fresh snapshot, for when a write proves it stale
  const resync = useCallback(() => streamRef.current?.reconnect({ resync: true }), []);

  return { resync };
}
