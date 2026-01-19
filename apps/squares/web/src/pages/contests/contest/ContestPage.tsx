import { Alert, Box, Chip, Typography } from '@mui/material';
import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate, useParams } from 'react-router-dom';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import ContestComponent from '../../../components/contest/Contest';
import ContestDetails from '../../../components/contest/ContestDetails';
import ContestPageSkeleton from '../../../components/contest/ContestPageSkeleton';
import GenericErrorDisplay from '../../../components/contest/GenericErrorDisplay';
import HowToPlay from '../../../components/contest/HowToPlay';
import ShareContest from '../../../components/contest/ShareContest';
import WinnersBoard from '../../../components/contest/WinnersBoard';
import {
  selectContestError,
  selectContestLoading,
  selectCurrentContest,
} from '../../../features/contests/contestSelectors';
import {
  clearError,
  updateContestFromWebSocket,
  updateQuarterResultFromWebSocket,
  updateSquareFromWebSocket,
} from '../../../features/contests/contestSlice';
import { fetchContestByOwnerAndName } from '../../../features/contests/contestThunks';
import {
  setConnectionDetails,
  setDisconnectionDetails,
  setLatestMessage,
} from '../../../features/ws/wsSlice';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';
import { contestSocketEventHandler, getSocketUrl } from '../../../service/wsService';

// contest page with grid, websocket connection, and sidebar details
export default function ContestPage() {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // track last processed message to prevent duplicates
  const lastProcessedMessageRef = useRef<string | null>(null);
  const dispatchCalled = useRef(false);
  const { owner, name } = useParams<{ owner: string; name: string }>();

  const loading = useAppSelector(selectContestLoading);
  const error = useAppSelector(selectContestError);
  const currentContest = useAppSelector(selectCurrentContest);

  // check if current user is contest owner
  const isOwner = auth.user?.profile?.preferred_username === currentContest?.owner;

  // build websocket url with contest id and auth token
  const socketUrl = useMemo(
    () => (currentContest?.id ? getSocketUrl(currentContest.id, auth) : undefined),
    [currentContest?.id, auth]
  );

  // only connect if authenticated and contest is active
  const shouldConnect = useMemo(
    () =>
      Boolean(
        owner &&
        name &&
        auth.isAuthenticated &&
        auth.user?.access_token &&
        currentContest &&
        currentContest.status !== 'FINISHED' &&
        currentContest.status !== 'DELETED'
      ),
    [owner, name, auth.isAuthenticated, auth.user?.access_token, currentContest]
  );

  // websocket options with auth token and reconnection settings
  const webSocketOptions = useMemo(
    () => ({
      protocols: auth.user?.access_token ? [auth.user.access_token] : undefined,
      reconnectAttempts: Infinity,
      reconnectInterval: (attempt: number) => Math.min(1000 * 2 ** (attempt - 1), 30000),
      shouldReconnect: () => shouldConnect,
    }),
    [auth.user?.access_token, shouldConnect]
  );

  // connect to websocket for real-time updates
  const { lastMessage, readyState } = useWebSocket(
    shouldConnect ? (socketUrl ?? null) : null,
    webSocketOptions
  );

  // track connection state
  const isConnected = readyState === ReadyState.OPEN;
  const isConnecting = readyState === ReadyState.CONNECTING;

  // handle incoming websocket messages and dispatch to redux
  useEffect(() => {
    if (!lastMessage?.data) {
      return;
    }

    // ignore duplicate messages
    if (lastProcessedMessageRef.current === lastMessage.data) {
      return;
    }

    lastProcessedMessageRef.current = lastMessage.data;

    // route websocket messages to appropriate handlers
    contestSocketEventHandler({
      lastMessage,
      // update square value from websocket message
      onSquareUpdate: (message) => {
        if (
          !message.square?.squareId ||
          message.contestId !== currentContest?.id ||
          message.square?.value === undefined
        ) {
          return;
        }

        dispatch(
          updateSquareFromWebSocket({
            id: message.square.squareId,
            value: message.square.value,
          })
        );
        dispatch(setLatestMessage(message));
      },
      // update contest details from websocket message
      onContestUpdate: (message) => {
        if (!message.contest) {
          return;
        }

        dispatch(
          updateContestFromWebSocket({
            xLabels: message.contest.xLabels,
            yLabels: message.contest.yLabels,
            homeTeam: message.contest.homeTeam,
            awayTeam: message.contest.awayTeam,
            status: message.contest.status,
          })
        );
        dispatch(setLatestMessage(message));
      },
      // update quarter result from websocket message
      onQuarterResultUpdate: (message) => {
        if (message.contestId !== currentContest?.id || !message.quarterResult) {
          return;
        }

        dispatch(
          updateQuarterResultFromWebSocket({
            quarter: message.quarterResult.quarter,
            homeTeamScore: message.quarterResult.homeTeamScore,
            awayTeamScore: message.quarterResult.awayTeamScore,
            winnerRow: message.quarterResult.winnerRow,
            winnerCol: message.quarterResult.winnerCol,
            winner: message.quarterResult.winner,
            winnerName: message.quarterResult.winnerName,
            status: message.quarterResult.status,
          })
        );
      },
      // handle contest deletion and navigate away
      onContestDeleted: (message) => {
        if (message.contestId !== currentContest?.id) {
          return;
        }

        showToast('Contest has been deleted', 'warning');
        if (!auth.isAuthenticated) {
          navigate('/');
        } else {
          navigate('/contests');
        }
      },
      // track connection status changes
      onConnect: (message) => {
        dispatch(setConnectionDetails(message));
      },
      onDisconnect: (message) => {
        dispatch(setDisconnectionDetails(message));
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
  ]);

  // fetch contest on mount and websocket disconnect
  useEffect(() => {
    if (!owner || !name || dispatchCalled.current) {
      return;
    }

    dispatch(fetchContestByOwnerAndName({ owner, name }));
    dispatchCalled.current = true;
  }, [owner, name, dispatch, readyState, dispatchCalled]);

  // show error toast and clear from store
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      dispatch(clearError());
    }
  }, [dispatch, error, showToast]);

  // show skeleton while loading
  if (!dispatchCalled || loading) {
    return <ContestPageSkeleton />;
  }

  // show error if contest not found
  if (dispatchCalled && !loading && !currentContest) {
    return <GenericErrorDisplay />;
  }

  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      {/* connection status indicator chip */}
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

      {/* contest name heading */}
      <Box sx={{ position: 'relative', mt: 2, mb: 1 }}>
        <Typography
          sx={{
            fontSize: { xs: '0.9rem', sm: '1.5rem', md: '1.7rem' },
            fontWeight: 800,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            textAlign: 'center',
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
        {/* left sidebar with contest details (desktop only) */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            gap: 1.5,
            flex: '0 0 280px',
          }}
        >
          <ContestDetails isOwner={isOwner} />
          <ShareContest contestName={currentContest?.name || ''} />
        </Box>

        {/* center section with contest grid */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flex: { xs: '1 1 auto', lg: '0 0 auto' },
          }}
        >
          <ContestComponent />
        </Box>

        {/* right sidebar with winners board and how to play (desktop only) */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            gap: 1.5,
            flex: '0 0 280px',
          }}
        >
          <WinnersBoard quarterResults={currentContest?.quarterResults} />
          <HowToPlay />
        </Box>
      </Box>

      {/* mobile layout with sidebars underneath grid */}
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
        <ShareContest contestName={currentContest?.name || ''} />
        <ContestDetails isOwner={isOwner} />
        <WinnersBoard quarterResults={currentContest?.quarterResults} />
        <HowToPlay />
      </Box>
    </Box>
  );
}
