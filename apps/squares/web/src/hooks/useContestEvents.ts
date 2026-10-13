import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useAppDispatch, useAppSelector } from './reduxHooks';
import { useToast } from './useToast';
import { selectCurrentContest } from '../features/contests/contestSelectors';
import { clearError, setCurrentContest } from '../features/contests/contestSlice';
import {
  getEventsUrl,
  handleContestEvent,
  parseContestEvent,
  StreamHTTPError,
  streamContestEvents,
} from '../service/contestEvents';
import type { ActivityEvent, ActivityEventType, Contest, Participant } from '../types/contest';
import type { ConnectionStatus, ContestEventCallbacks, StreamFrame } from '../types/events';

// a missing or forbidden contest will not change by retrying
export const FATAL_STREAM_STATUSES = [403, 404];
const MAX_RETRIES = 5;
const MAX_BACKOFF_MS = 15000;
const GHOST_USER = 'ghost';

// a ghosted square (owner left a private contest) keeps its value but has no owner name
const winnerLabel = (winner: string, winnerName: string) =>
  winner === GHOST_USER ? 'ghost' : winnerName;

const backoff = (attempt: number) => Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS);

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

interface UseContestEventsParams {
  id: string | undefined;
  onContestDeleted: () => void;
  onParticipantRemoved: (isCurrentUser: boolean, isPrivate: boolean) => void;
  onWinnerSquare: (row: number, col: number) => void;
  onWinnerDialog: (data: {
    quarter: number;
    homeScore: number;
    awayScore: number;
    row: number;
    col: number;
  }) => void;
}

export function useContestEvents({
  id,
  onContestDeleted,
  onParticipantRemoved,
  onWinnerSquare,
  onWinnerDialog,
}: UseContestEventsParams) {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const currentContest = useAppSelector(selectCurrentContest);

  const [retryCount, setRetryCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [fatalStatus, setFatalStatus] = useState<number | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  // survives reconnects for the same contest, so a dropped stream resumes where it left off
  const lastEventIdRef = useRef<string | null>(null);

  const token = !auth.isLoading && auth.isAuthenticated ? auth.user?.id_token : undefined;
  const email = auth.user?.profile?.email;

  // reset state when switching contests
  useEffect(() => {
    lastEventIdRef.current = null;
    setActivityEvents([]);
    setRetryCount(0);
    setIsConnected(false);
    setIsConnecting(true);
    setConnectionFailed(false);
    setFatalStatus(null);
    dispatch(setCurrentContest(null));

    return () => {
      dispatch(setCurrentContest(null));
    };
  }, [id, dispatch]);

  const seedActivityFromConnected = useCallback((contest: Contest, participants: Participant[]) => {
    const seeded: ActivityEvent[] = [];
    participants
      .filter((p) => p.role !== 'owner')
      .forEach((p) => {
        seeded.push({
          id: `seed-participant-${p.id}`,
          type: 'participant_added',
          message: `${p.userId} joined the contest`,
          timestamp: p.joinedAt || p.createdAt,
        });
      });

    contest.squares
      ?.filter((s) => s.value && s.value.trim() !== '')
      .forEach((s) => {
        seeded.push({
          id: `seed-square-${s.id}`,
          type: 'square_claimed',
          message: `${s.ownerName || 'Someone'} claimed square (${s.row}, ${s.col})`,
          timestamp: s.updatedAt || s.createdAt,
        });
      });

    contest.quarterResults?.forEach((qr) => {
      seeded.push({
        id: `seed-qr-${qr.id}`,
        type: 'quarter_winner',
        message: `Q${qr.quarter} winner: ${winnerLabel(qr.winner, qr.winnerName)} (${qr.homeTeamScore}-${qr.awayTeamScore})`,
        timestamp: qr.createdAt,
      });
    });

    seeded.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setActivityEvents(seeded);
  }, []);

  const addActivityEvent = useCallback((type: ActivityEventType, message: string) => {
    const event: ActivityEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      message,
      timestamp: new Date().toISOString(),
    };
    setActivityEvents((prev) => [...prev, event]);
  }, []);

  // the stream outlives renders, so it reads the latest callbacks through a ref instead of reconnecting
  const callbacks: ContestEventCallbacks = {
    onConnected: seedActivityFromConnected,
    onContestDeleted,
    onRevoked: () => {
      setFatalStatus(403);
    },
    onError: (error) => {
      showToast(error, 'error');
    },
    onSquareUpdate: (value, row, col, ownerName) => {
      // a cleared square arrives as a square_update with an empty value and no owner
      if (!value || value.trim() === '') {
        addActivityEvent('square_cleared', `Square (${row}, ${col}) was cleared`);
        return;
      }

      addActivityEvent('square_claimed', `${ownerName} claimed square (${row}, ${col})`);
    },
    onQuarterResultUpdate: (
      quarter,
      winnerName,
      homeScore,
      awayScore,
      winnerRow,
      winnerCol,
      winner
    ) => {
      addActivityEvent(
        'quarter_winner',
        `Q${quarter} winner: ${winnerLabel(winner, winnerName)} (${homeScore}-${awayScore})`
      );

      onWinnerSquare(winnerRow, winnerCol);

      if (winner === email) {
        onWinnerDialog({ quarter, homeScore, awayScore, row: winnerRow, col: winnerCol });
      }
    },
    onQuarterResultRollback: (quarter) => {
      addActivityEvent('contest_status', `Q${quarter} result was rolled back`);
    },
    onContestUpdate: (status) => {
      if (status) {
        addActivityEvent('contest_status', `Contest status changed to ${status}`);
      }
    },
    onParticipantAdded: (participant) => {
      addActivityEvent('participant_added', `${participant.userId} joined the contest`);
    },
    onParticipantRemoved: (participant) => {
      addActivityEvent('participant_removed', `${participant.userId} was removed`);
      if (participant.userId === email) {
        onParticipantRemoved(true, currentContest?.visibility === 'private');
      }
    },
  };
  const callbacksRef = useRef(callbacks);
  const contestIdRef = useRef(currentContest?.id ?? '');
  useEffect(() => {
    callbacksRef.current = callbacks;
    contestIdRef.current = currentContest?.id ?? '';
  });

  // one long-lived stream per contest; a token refresh reconnects and resumes from the last event
  useEffect(() => {
    const url = getEventsUrl(id);
    if (!url || !token) {
      return;
    }

    const controller = new AbortController();
    let ended = false;

    const onFrame = (frame: StreamFrame) => {
      if (frame.id) {
        lastEventIdRef.current = frame.id;
      }

      const event = parseContestEvent(frame.data);
      if (!event) {
        callbacksRef.current.onError?.('Received an invalid update from the server');
        return;
      }

      if (event.type === 'revoked' || event.type === 'contest_deleted') {
        ended = true;
      }

      // the snapshot is about to replace the contest, so later events in this stream belong to it
      if (event.type === 'connected' && event.contest) {
        contestIdRef.current = event.contest.id;
      }

      handleContestEvent({
        event,
        dispatch,
        currentContestId: contestIdRef.current,
        callbacks: callbacksRef.current,
      });
    };

    const run = async () => {
      let attempt = 0;
      while (!controller.signal.aborted) {
        try {
          await streamContestEvents({
            url,
            token,
            lastEventId: lastEventIdRef.current,
            signal: controller.signal,
            onOpen: () => {
              attempt = 0;
              setIsConnected(true);
              setIsConnecting(false);
              setConnectionFailed(false);
              setRetryCount(0);
            },
            onFrame,
          });
        } catch (err: unknown) {
          if (controller.signal.aborted) {
            return;
          }
          if (err instanceof StreamHTTPError && FATAL_STREAM_STATUSES.includes(err.status)) {
            setFatalStatus(err.status);
            setIsConnecting(false);
            return;
          }
        }

        setIsConnected(false);
        if (ended || controller.signal.aborted) {
          return;
        }

        // the server ends streams on deploys and token expiry; reconnect and pick up from the last event id
        attempt++;
        setRetryCount(attempt);
        if (attempt > MAX_RETRIES) {
          setConnectionFailed(true);
          setIsConnecting(false);
          return;
        }
        await wait(backoff(attempt), controller.signal);
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [id, token, reconnectNonce, dispatch]);

  // drops local state and starts over from a fresh snapshot
  const forceReconnect = useCallback(() => {
    dispatch(setCurrentContest(null));
    lastEventIdRef.current = null;
    setActivityEvents([]);
    setIsConnecting(true);
    setConnectionFailed(false);
    setRetryCount(0);
    setReconnectNonce((n) => n + 1);
  }, [dispatch]);

  // show error toast and clear from store
  const error = useAppSelector((state) => state.contest.error);
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      dispatch(clearError());
    }
  }, [dispatch, error, showToast]);

  // determine connection status for chip
  const connectionStatus: ConnectionStatus = connectionFailed
    ? 'failed'
    : isConnected
      ? 'connected'
      : retryCount > 0
        ? 'reconnecting'
        : 'connecting';

  return {
    activityEvents,
    isConnected,
    isConnecting,
    connectionFailed,
    connectionStatus,
    retryCount,
    fatalStatus,
    hasFatalError: fatalStatus !== null,
    forceReconnect,
  };
}
