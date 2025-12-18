import { Alert, Box, Chip, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate, useParams } from 'react-router-dom';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import GenericErrorDisplay from '../../../components/common/GenericErrorDisplay';
import ContestComponent from '../../../components/contest/Contest';
import ContestPageSkeleton from '../../../components/contest/ContestPageSkeleton';
import ContestDetails from '../../../components/contest/ContestDetails';
import HowToPlay from '../../../components/contest/HowToPlay';
import WinnersBoard from '../../../components/contest/WinnersBoard';
import {
  selectContestError,
  selectContestLoading,
  selectCurrentContest,
} from '../../../features/contests/contestSelectors';
import {
  clearError,
  updateContestFromWebSocket,
  updateSquareFromWebSocket,
} from '../../../features/contests/contestSlice';
import { fetchContestById } from '../../../features/contests/contestThunks';
import {
  setConnectionDetails,
  setDisconnectionDetails,
  setLatestMessage,
} from '../../../features/ws/wsSlice';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';
import { contestSocketEventHandler, getSocketUrl } from '../../../service/wsService';

export default function ContestPage() {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const lastProcessedMessageRef = useRef<string | null>(null);
  const { id } = useParams<{ id: string }>();
  const [dispatchCalled, setDispatchCalled] = useState(false);

  const loading = useAppSelector(selectContestLoading);
  const error = useAppSelector(selectContestError);
  const currentContest = useAppSelector(selectCurrentContest);

  const isOwner = auth.user?.profile?.preferred_username === currentContest?.owner;

  const socketUrl = useMemo(() => getSocketUrl(id, auth), [id, auth]);
  const shouldConnect = useMemo(
    () => Boolean(id && auth.isAuthenticated && auth.user?.access_token && currentContest),
    [id, auth.isAuthenticated, auth.user?.access_token, currentContest]
  );
  const webSocketOptions = useMemo(
    () => ({
      protocols: auth.user?.access_token ? [auth.user.access_token] : undefined,
      reconnectAttempts: 5,
      reconnectInterval: 5000,
      shouldReconnect: () => shouldConnect,
    }),
    [auth.user?.access_token, shouldConnect]
  );

  const { lastMessage, readyState } = useWebSocket(
    shouldConnect ? socketUrl : null,
    webSocketOptions
  );

  const isConnected = readyState === ReadyState.OPEN;
  const isConnecting = readyState === ReadyState.CONNECTING;

  useEffect(() => {
    if (!lastMessage?.data) {
      return;
    }

    // ignore duplicate messages
    if (lastProcessedMessageRef.current === lastMessage.data) {
      return;
    }

    lastProcessedMessageRef.current = lastMessage.data;
    contestSocketEventHandler({
      lastMessage,
      onSquareUpdate: (message) => {
        if (
          message.square?.squareId &&
          message.contestId === currentContest?.id &&
          message.square?.value !== undefined
        ) {
          dispatch(
            updateSquareFromWebSocket({
              id: message.square.squareId,
              value: message.square.value,
            })
          );
          dispatch(setLatestMessage(message));
        }
      },
      onContestUpdate: (message) => {
        if (
          message.contestId === currentContest?.id &&
          message.contest?.xLabels !== undefined &&
          message.contest?.yLabels !== undefined
        ) {
          dispatch(
            updateContestFromWebSocket({
              xLabels: message.contest.xLabels,
              yLabels: message.contest.yLabels,
            })
          );
          dispatch(setLatestMessage(message));
        }
      },
      onContestDeleted: (message) => {
        if (message.contestId === currentContest?.id) {
          showToast('Contest has been deleted', 'warning');
          if (!auth.isAuthenticated) {
            navigate('/');
          } else {
            navigate('/contests');
          }
        }
      },
      onConnect: (message) => {
        dispatch(setConnectionDetails(message));
      },
      onDisconnect: (message) => {
        dispatch(setDisconnectionDetails(message));
      },
    });
  }, [lastMessage, dispatch, currentContest?.id, showToast, navigate, auth.isAuthenticated]);

  useEffect(() => {
    if (!id) {
      return;
    }

    dispatch(fetchContestById(id));
    setDispatchCalled(true);
  }, [id, dispatch]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      dispatch(clearError());
    }
  }, [dispatch, error, showToast]);

  if (!dispatchCalled || loading) {
    return <ContestPageSkeleton />;
  }

  if (dispatchCalled && !loading && !currentContest) {
    return <GenericErrorDisplay />;
  }

  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      {/* Not logged in alert - Top Left */}
      {!auth.isAuthenticated && (
        <Alert
          severity="info"
          sx={{
            position: 'absolute',
            top: 0,
            left: 14,
          }}
        >
          Must sign in to play
        </Alert>
      )}

      <Typography
        sx={{
          fontSize: { xs: '1rem', sm: '1.5rem', md: '2rem' },
          fontWeight: 800,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          textAlign: 'center',
          flex: 1,
          mt: 2,
          mb: 1,
        }}
      >
        {currentContest?.name ?? ''}
      </Typography>

      <Chip
        label={isConnected ? 'Live' : isConnected ? 'Connecting' : 'Offline'}
        color={isConnected ? 'success' : isConnecting ? 'warning' : 'default'}
        size="small"
        variant={isConnected ? 'filled' : 'outlined'}
        sx={{
          position: 'absolute',
          top: 0,
          right: 14,
        }}
      />

      {/* Three-column layout */}
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
        {/* Left Sidebar - How to Play */}
        <Box sx={{ display: { xs: 'none', lg: 'block' }, flex: '0 0 280px' }}>
          <HowToPlay />
        </Box>

        {/* Center - Contest Grid */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flex: { xs: '1 1 auto', lg: '0 0 auto' },
          }}
        >
          <ContestComponent />
        </Box>

        {/* Right Sidebar - Winners Board & Contest Details */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            gap: 3,
            flex: '0 0 280px',
          }}
        >
          <WinnersBoard />
          <ContestDetails isOwner={isOwner} />
        </Box>
      </Box>

      {/* Mobile: Sidebars underneath contest grid */}
      <Box
        sx={{
          display: { xs: 'flex', lg: 'none' },
          flexDirection: 'column',
          gap: 3,
          width: '100%',
          maxWidth: { xs: '360px', sm: '490px', md: '600px' },
          margin: '0 auto',
          p: 1,
          mb: 2,
        }}
      >
        <HowToPlay />
        <WinnersBoard />
        <ContestDetails isOwner={isOwner} />
      </Box>
    </Box>
  );
}
