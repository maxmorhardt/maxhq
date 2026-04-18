import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useAppDispatch, useAppSelector } from './reduxHooks';
import { useToast } from './useToast';
import { selectCurrentContest } from '../features/contests/contestSelectors';
import { clearError, setCurrentContest } from '../features/contests/contestSlice';
import { fetchContestByOwnerAndName, fetchParticipants } from '../features/contests/contestThunks';
import { contestSocketEventHandler, getSocketUrl } from '../service/wsService';
import type { ActivityEvent, ActivityEventType, ChatMessage } from '../types/contest';
import type { ConnectionStatus, WSUICallbacks } from '../types/ws';

const MAX_RETRY_ATTEMPTS = 5;
const FATAL_CLOSE_CODES = [4404, 4500, 4503];

interface UseContestWebSocketParams {
  owner: string | undefined;
  name: string | undefined;
  onContestDeleted: () => void;
  onWinnerSquare: (row: number, col: number) => void;
  onWinnerDialog: (data: {
    quarter: number;
    homeScore: number;
    awayScore: number;
    row: number;
    col: number;
  }) => void;
}

export function useContestWebSocket({
  owner,
  name,
  onContestDeleted,
  onWinnerSquare,
  onWinnerDialog,
}: UseContestWebSocketParams) {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const currentContest = useAppSelector(selectCurrentContest);
  const hasFetchedContest = useRef(false);
  const lastProcessedMessageRef = useRef<string | null>(null);

  const [retryCount, setRetryCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [wsCloseCode, setWsCloseCode] = useState<number | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [fetchErrorCode, setFetchErrorCode] = useState<number | null>(null);

  const isAuthenticated = !auth.isLoading && auth.isAuthenticated;
  const hasFatalWsError = wsCloseCode !== null && FATAL_CLOSE_CODES.includes(wsCloseCode);

  const reconnectInterval = Math.min(1000 * Math.pow(2, retryCount), 30000);
  const socketUrl = isAuthenticated && !fetchErrorCode ? getSocketUrl(owner, name, auth) : null;

  // reset state when switching contests
  useEffect(() => {
    hasFetchedContest.current = false;
    lastProcessedMessageRef.current = null;
    setActivityEvents([]);
    setChatMessages([]);
    setRetryCount(0);
    setIsConnecting(true);
    setConnectionFailed(false);
    setWsCloseCode(null);
    setFetchErrorCode(null);
    dispatch(setCurrentContest(null));

    return () => {
      dispatch(setCurrentContest(null));
    };
  }, [owner, name, dispatch]);

  // connect to websocket
  const { lastMessage, readyState, sendJsonMessage } = useWebSocket(socketUrl, {
    shouldReconnect: (event: CloseEvent) =>
      !FATAL_CLOSE_CODES.includes(event.code) &&
      socketUrl !== null &&
      retryCount < MAX_RETRY_ATTEMPTS,
    reconnectAttempts: MAX_RETRY_ATTEMPTS,
    reconnectInterval,
    protocols: auth.user?.access_token ? [auth.user.access_token] : undefined,
    onOpen: () => {
      setIsConnecting(false);
      setConnectionFailed(false);
      setRetryCount(0);
    },
    onError: () => {
      setRetryCount((prev) => {
        const next = prev + 1;
        if (next >= MAX_RETRY_ATTEMPTS) {
          setConnectionFailed(true);
        }
        return next;
      });
    },
    onClose: (event: CloseEvent) => {
      if (FATAL_CLOSE_CODES.includes(event.code)) {
        setWsCloseCode(event.code);
        setIsConnecting(false);
      }
    },
  });

  const isConnected = useMemo(() => readyState === ReadyState.OPEN, [readyState]);

  // fetch contest data once websocket is connected, then seed activity feed
  useEffect(() => {
    if (!owner || !name || !isConnected || hasFetchedContest.current || hasFatalWsError) {
      return;
    }

    (async () => {
      try {
        const contest = await dispatch(fetchContestByOwnerAndName({ owner, name })).unwrap();
        hasFetchedContest.current = true;

        dispatch(fetchParticipants(contest.id));

        const seeded: ActivityEvent[] = [];

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
            message: `Q${qr.quarter} winner: ${qr.winnerName} (${qr.homeTeamScore}-${qr.awayTeamScore})`,
            timestamp: qr.createdAt,
          });
        });

        seeded.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setActivityEvents(seeded);
      } catch (err) {
        const apiError = err as { code?: number; message?: string };
        setFetchErrorCode(apiError.code ?? 500);
        console.error('Failed to fetch contest:', err);
      }
    })();
  }, [owner, name, dispatch, isConnected, hasFatalWsError]);

  // add a new activity event from WS
  const addActivityEvent = useCallback((type: ActivityEventType, message: string) => {
    const event: ActivityEvent = {
      id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      message,
      timestamp: new Date().toISOString(),
    };
    setActivityEvents((prev) => [...prev, event]);
  }, []);

  // send a chat message via websocket
  const sendChatMessage = useCallback(
    (message: string) => {
      if (!isConnected) return;
      sendJsonMessage({ message });
    },
    [isConnected, sendJsonMessage]
  );

  // handle incoming websocket messages
  useEffect(() => {
    contestSocketEventHandler({
      lastMessage,
      dispatch,
      currentContestId: currentContest?.id || '',
      lastProcessedMessageRef,
      callbacks: {
        onContestDeleted,
        onError: (error) => {
          showToast(error, 'error');
        },
        onSquareUpdate: (_value, row, col, ownerName) => {
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
            `Q${quarter} winner: ${winnerName} (${homeScore}-${awayScore})`
          );

          onWinnerSquare(winnerRow, winnerCol);

          if (winner === auth.user?.profile?.preferred_username) {
            onWinnerDialog({ quarter, homeScore, awayScore, row: winnerRow, col: winnerCol });
          }
        },
        onContestUpdate: (status) => {
          if (status) {
            addActivityEvent('contest_status', `Contest status changed to ${status}`);
          }
        },
        onChatMessage: (sender, message, timestamp) => {
          setChatMessages((prev) => [
            ...prev,
            {
              id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              sender,
              message,
              timestamp,
            },
          ]);
        },
      } satisfies WSUICallbacks,
    });
  }, [
    owner,
    name,
    lastMessage,
    dispatch,
    currentContest?.id,
    showToast,
    auth.user?.profile?.preferred_username,
    addActivityEvent,
    onContestDeleted,
    onWinnerSquare,
    onWinnerDialog,
  ]);

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
    chatMessages,
    sendChatMessage,
    isConnected,
    isConnecting,
    connectionFailed,
    connectionStatus,
    retryCount,
    wsCloseCode,
    hasFatalWsError,
    fetchErrorCode,
    hasFetchedContest: hasFetchedContest.current,
  };
}
