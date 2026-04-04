import { EmojiEvents } from '@mui/icons-material';
import { Alert, Box, Button, Dialog, DialogContent, keyframes, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate, useParams } from 'react-router-dom';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import ActivityFeed from '../../../components/contest/ActivityFeed';
import ConnectionChip from '../../../components/contest/ConnectionChip';
import ContestComponent from '../../../components/contest/Contest';
import ContestDetails from '../../../components/contest/ContestDetails';
import ContestPageSkeleton from '../../../components/contest/ContestPageSkeleton';
import GenericErrorDisplay from '../../../components/contest/GenericErrorDisplay';
import NotFoundPage from '../../error/NotFoundPage';
import LiveChat from '../../../components/contest/LiveChat';
import WinnersBoard from '../../../components/contest/WinnersBoard';
import ContestSignIn from '../../../components/contest/ContestSignIn';
import {
  selectContestError,
  selectCurrentContest,
} from '../../../features/contests/contestSelectors';
import { clearError, setCurrentContest } from '../../../features/contests/contestSlice';
import { fetchContestByOwnerAndName } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';
import { contestSocketEventHandler, getSocketUrl } from '../../../service/wsService';
import type { ActivityEvent, ActivityEventType, ChatMessage } from '../../../types/contest';
import type { ConnectionStatus } from '../../../types/ws';

export default function ContestPage() {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { owner, name } = useParams<{ owner: string; name: string }>();
  const hasFetchedContest = useRef(false);

  const error = useAppSelector(selectContestError);
  const currentContest = useAppSelector(selectCurrentContest);

  const [retryCount, setRetryCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [wsCloseCode, setWsCloseCode] = useState<number | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newWinnerSquare, setNewWinnerSquare] = useState<{ row: number; col: number } | null>(null);
  const [winnerDialog, setWinnerDialog] = useState<{
    quarter: number;
    homeScore: number;
    awayScore: number;
    row: number;
    col: number;
  } | null>(null);
  const lastProcessedMessageRef = useRef<string | null>(null);

  const isAuthenticated = !auth.isLoading && auth.isAuthenticated;

  // WS close codes that indicate a fatal error (no reconnect, no fetch)
  const FATAL_CLOSE_CODES = [4404, 4500, 4503];
  const hasFatalWsError = wsCloseCode !== null && FATAL_CLOSE_CODES.includes(wsCloseCode);

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
    dispatch(setCurrentContest(null));

    // clear contest from redux on unmount / navigate away
    return () => {
      dispatch(setCurrentContest(null));
    };
  }, [owner, name, dispatch]);

  const MAX_RETRY_ATTEMPTS = 5;
  const isOwner = auth.user?.profile?.preferred_username === currentContest?.owner;
  const reconnectInterval = Math.min(1000 * Math.pow(2, retryCount), 30000);
  const socketUrl = isAuthenticated ? getSocketUrl(owner, name, auth) : null;

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

  const isConnected = useMemo(() => {
    return readyState === ReadyState.OPEN;
  }, [readyState]);

  // fetch contest data once websocket is connected, then seed activity feed
  useEffect(() => {
    if (!owner || !name || !isConnected || hasFetchedContest.current || hasFatalWsError) {
      return;
    }

    (async () => {
      try {
        const contest = await dispatch(fetchContestByOwnerAndName({ owner, name })).unwrap();
        hasFetchedContest.current = true;

        // seed activity feed from fetched contest data
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
        onContestDeleted: () => {
          showToast('Contest has been deleted', 'warning');
          if (!auth.isAuthenticated) {
            navigate('/');
          } else {
            navigate('/contests');
          }
        },
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

          // pulse the winning square briefly
          setNewWinnerSquare({ row: winnerRow, col: winnerCol });
          setTimeout(() => setNewWinnerSquare(null), 2000);

          // show winner dialog if it's me
          if (winner === auth.user?.profile?.preferred_username) {
            setWinnerDialog({ quarter, homeScore, awayScore, row: winnerRow, col: winnerCol });
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
      },
    });
  }, [
    owner,
    name,
    lastMessage,
    dispatch,
    currentContest?.id,
    showToast,
    navigate,
    auth.isAuthenticated,
    auth.user?.profile?.preferred_username,
    addActivityEvent,
  ]);

  // show error toast and clear from store
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      dispatch(clearError());
    }
  }, [dispatch, error, showToast]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const contestName = currentContest?.name || '';

    if (!navigator.share) {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }
      return;
    }

    try {
      await navigator.share({
        title: contestName,
        text: `Join my squares contest: ${contestName || 'Contest'}`,
        url: shareUrl,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // prompt unauthenticated users to sign in (skip loading state during silent sign-out)
  if ((!auth.isLoading && !auth.isAuthenticated) || auth.activeNavigator === 'signoutSilent') {
    return <ContestSignIn />;
  }

  // show error if connection failed after max retries
  if (connectionFailed) {
    return <GenericErrorDisplay />;
  }

  // determine connection status for chip
  const connectionStatus: ConnectionStatus = connectionFailed
    ? 'failed'
    : isConnected
      ? 'connected'
      : retryCount > 0
        ? 'reconnecting'
        : 'connecting';

  // handle fatal WS close codes
  if (hasFatalWsError) {
    if (wsCloseCode === 4404) {
      return <NotFoundPage />;
    }
    return <GenericErrorDisplay />;
  }

  // show error if contest not found after fetch
  if (!currentContest && hasFetchedContest.current) {
    return <NotFoundPage />;
  }

  // show skeleton while connecting or loading contest data
  if (isConnecting || !isConnected || !currentContest) {
    return <ContestPageSkeleton connectionStatus={connectionStatus} retryCount={retryCount} />;
  }

  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      {/* connection status indicator chip */}
      <ConnectionChip status={connectionStatus} retryCount={retryCount} />

      {/* contest name heading */}
      <Box sx={{ position: 'relative', mt: 2, mb: 1, px: 5 }}>
        <Typography
          sx={{
            fontSize: { xs: '0.75rem', sm: '1.5rem', md: '1.7rem' },
            fontWeight: 800,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {currentContest?.name ?? ''}
        </Typography>
      </Box>

      {/* sign in prompt for unauthenticated users */}
      {!auth.isAuthenticated && (
        <Box
          sx={{
            display: { xs: 'flex', lg: 'none' },
            justifyContent: 'center',
          }}
        >
          <Alert
            severity="info"
            sx={{
              minWidth: { xs: '22rem', sm: '35rem', md: '40rem' },
            }}
          >
            Sign in to claim squares and play
          </Alert>
        </Box>
      )}

      {/* responsive layout with contest grid and sidebars */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
          width: '100%',
          maxWidth: '1600px',
          margin: '0 auto',
          alignItems: { xs: 'center', lg: 'flex-start' },
          justifyContent: 'center',
          p: 1,
        }}
      >
        {/* left sidebar with winners board, activity feed, and action icons (desktop only) */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            gap: 1.5,
            flex: '0 0 280px',
          }}
        >
          <WinnersBoard quarterResults={currentContest?.quarterResults} />
          <ActivityFeed events={activityEvents} />
        </Box>

        {/* center section with contest grid */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flex: { xs: '1 1 auto', lg: '0 0 auto' },
          }}
        >
          <ContestComponent newWinnerSquare={newWinnerSquare} />
        </Box>

        {/* right sidebar with contest details and live chat (desktop only) */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            gap: 1.5,
            flex: '0 0 280px',
          }}
        >
          <ContestDetails isOwner={isOwner} onShare={handleShare} />
          <LiveChat
            messages={chatMessages}
            onSend={sendChatMessage}
            currentUser={auth.user?.profile?.preferred_username as string}
            disabled={!auth.isAuthenticated || !isConnected}
          />
        </Box>
      </Box>

      {/* mobile layout with all sections underneath grid */}
      <Box
        sx={{
          display: { xs: 'flex', lg: 'none' },
          flexDirection: 'column',
          gap: 3,
          width: '100%',
          maxWidth: { xs: '360px', sm: '490px', md: '600px' },
          margin: '0 auto',
          p: 1,
          mb: 3,
          mt: 2,
        }}
      >
        <ContestDetails isOwner={isOwner} onShare={handleShare} />
        <WinnersBoard quarterResults={currentContest?.quarterResults} />
        <LiveChat
          messages={chatMessages}
          onSend={sendChatMessage}
          currentUser={auth.user?.profile?.preferred_username as string}
          disabled={!auth.isAuthenticated || !isConnected}
        />
        <ActivityFeed events={activityEvents} />
      </Box>

      {/* winner celebration dialog */}
      <Dialog
        open={!!winnerDialog}
        onClose={() => setWinnerDialog(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              background:
                'linear-gradient(135deg, rgba(20,20,30,0.97) 0%, rgba(15,40,25,0.97) 100%)',
              border: '1px solid rgba(67, 233, 123, 0.3)',
              borderRadius: 3,
              overflow: 'visible',
            },
          },
        }}
      >
        <DialogContent sx={{ textAlign: 'center', pt: 5, pb: 4, px: 3 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, rgba(67,233,123,0.25) 0%, rgba(67,233,123,0.1) 100%)',
              border: '2px solid rgba(67,233,123,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
              animation: `${keyframes`
                0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(67,233,123,0.2); }
                50% { transform: scale(1.08); box-shadow: 0 0 32px rgba(67,233,123,0.4); }
              `} 2s ease-in-out infinite`,
            }}
          >
            <EmojiEvents sx={{ fontSize: 36, color: '#ffd700' }} />
          </Box>
          <Typography
            sx={{
              fontSize: '1.6rem',
              fontWeight: 800,
              mb: 1,
              background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            You Won!
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', mb: 0.5 }}>
            Your square ({winnerDialog?.col}, {winnerDialog?.row}) took Quarter{' '}
            {winnerDialog?.quarter}
          </Typography>
          <Typography
            sx={{
              fontSize: '1.8rem',
              fontWeight: 700,
              color: 'white',
              mt: 1.5,
              mb: 2,
              letterSpacing: 2,
            }}
          >
            {winnerDialog?.homeScore} &ndash; {winnerDialog?.awayScore}
          </Typography>
          <Button
            variant="contained"
            onClick={() => setWinnerDialog(null)}
            sx={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: '#0a0a0a',
              fontWeight: 700,
              px: 4,
              py: 1,
              borderRadius: 2,
              fontSize: '0.95rem',
              '&:hover': {
                background: 'linear-gradient(135deg, #38f9d7 0%, #43e97b 100%)',
              },
            }}
          >
            Let's Go!
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
