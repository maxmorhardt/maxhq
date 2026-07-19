import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import ReactUseWebSocket, { ReadyState } from 'react-use-websocket';
import { useAppDispatch, useAppSelector } from './reduxHooks';
import { useToast } from './useToast';
import { selectCurrentContest } from '../features/contests/contestSelectors';
import { clearError, setCurrentContest } from '../features/contests/contestSlice';
import { contestSocketEventHandler, getSocketUrl } from '../service/wsService';
import type {
  ActivityEvent,
  ActivityEventType,
  ChatMessage,
  Contest,
  Participant,
} from '../types/contest';
import type { ConnectionStatus, WSUICallbacks } from '../types/ws';

// fix until use websocket migrates off CJS
const useWebSocket =
  (ReactUseWebSocket as unknown as { default?: typeof ReactUseWebSocket }).default ??
  ReactUseWebSocket;

const RECONNECT_INTERVAL_MS = 1000;
const FATAL_CLOSE_CODES = [4403, 4404, 4500, 4503];
const GHOST_USER = 'ghost';

// a ghosted square (owner left a private contest) keeps its value but has no owner name
const winnerLabel = (winner: string, winnerName: string) =>
  winner === GHOST_USER ? 'ghost' : winnerName;

interface UseContestWebSocketParams {
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

export function useContestWebSocket({
  id,
  onContestDeleted,
  onParticipantRemoved,
  onWinnerSquare,
  onWinnerDialog,
}: UseContestWebSocketParams) {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const currentContest = useAppSelector(selectCurrentContest);
  const lastProcessedMessageRef = useRef<string | null>(null);

  const [retryCount, setRetryCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [wsCloseCode, setWsCloseCode] = useState<number | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const isAuthenticated = !auth.isLoading && auth.isAuthenticated;
  const hasFatalWsError = wsCloseCode !== null && FATAL_CLOSE_CODES.includes(wsCloseCode);

  const socketUrl = isAuthenticated ? getSocketUrl(id, auth) : null;

  // reset state when switching contests
  useEffect(() => {
    lastProcessedMessageRef.current = null;
    setActivityEvents([]);
    setChatMessages([]);
    setRetryCount(0);
    setIsConnecting(true);
    setConnectionFailed(false);
    setWsCloseCode(null);
    dispatch(setCurrentContest(null));

    return () => {
      dispatch(setCurrentContest(null));
    };
  }, [id, dispatch]);

  const { lastMessage, readyState, sendJsonMessage, getWebSocket } = useWebSocket(
    socketUrl,
    {
      shouldReconnect: (event: CloseEvent) =>
        !FATAL_CLOSE_CODES.includes(event.code) && socketUrl !== null,
      reconnectAttempts: 1,
      reconnectInterval: RECONNECT_INTERVAL_MS,
      protocols: auth.user?.id_token ? [auth.user.id_token] : undefined,
      onOpen: () => {
        setIsConnecting(false);
        setConnectionFailed(false);
        setRetryCount(0);
      },
      onError: () => {
        setRetryCount((prev) => prev + 1);
      },
      onClose: (event: CloseEvent) => {
        if (FATAL_CLOSE_CODES.includes(event.code)) {
          setWsCloseCode(event.code);
          setIsConnecting(false);
        }
      },
      onReconnectStop: () => {
        setConnectionFailed(true);
        setIsConnecting(false);
      },
    },
    socketUrl !== null // connect only when URL is available
  );

  const isConnected = useMemo(() => readyState === ReadyState.OPEN, [readyState]);

  const forceReconnect = useCallback(() => {
    dispatch(setCurrentContest(null));
    lastProcessedMessageRef.current = null;
    setActivityEvents([]);
    setIsConnecting(true);
    // closing the socket triggers react-use-websocket's reconnect cycle
    getWebSocket()?.close();
  }, [dispatch, getWebSocket]);

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
      id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      message,
      timestamp: new Date().toISOString(),
    };
    setActivityEvents((prev) => [...prev, event]);
  }, []);

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
        onConnected: seedActivityFromConnected,
        onContestDeleted,
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

          if (winner === auth.user?.profile?.email) {
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
        onParticipantAdded: (participant) => {
          addActivityEvent('participant_added', `${participant.userId} joined the contest`);
        },
        onParticipantRemoved: (participant) => {
          addActivityEvent('participant_removed', `${participant.userId} was removed`);
          const currentUsername = auth.user?.profile?.email;
          if (participant.userId === currentUsername) {
            const isPrivate = currentContest?.visibility === 'private';
            onParticipantRemoved(true, isPrivate);
          }
        },
      } satisfies WSUICallbacks,
    });
  }, [
    id,
    lastMessage,
    dispatch,
    currentContest?.id,
    showToast,
    auth.user?.profile?.email,
    addActivityEvent,
    seedActivityFromConnected,
    onContestDeleted,
    onParticipantRemoved,
    onWinnerSquare,
    onWinnerDialog,
    currentContest?.visibility,
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
    forceReconnect,
  };
}
