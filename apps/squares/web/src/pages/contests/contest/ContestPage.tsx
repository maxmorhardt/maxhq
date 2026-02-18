import { Alert, Box, Chip, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  selectCurrentContest,
} from '../../../features/contests/contestSelectors';
import { clearError } from '../../../features/contests/contestSlice';
import { fetchContestByOwnerAndName } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';
import { contestSocketEventHandler, getSocketUrl } from '../../../service/wsService';

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
  const lastProcessedMessageRef = useRef<string | null>(null);

  const isOwner = auth.user?.profile?.preferred_username === currentContest?.owner;
  const reconnectInterval = Math.min(1000 * Math.pow(2, retryCount), 15000);
  const socketUrl = getSocketUrl(owner, name, auth);

  // connect to websocket
  const { lastMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => socketUrl !== null,
    reconnectAttempts: Infinity,
    reconnectInterval,
    protocols: auth.user?.access_token ? [auth.user.access_token] : undefined,
    onOpen: () => {
      setIsConnecting(false);
      setRetryCount(0);
    },
    onError: () => {
      setRetryCount(retryCount + 1);
    },
  });

  const isConnected = useMemo(() => {
    return readyState === ReadyState.OPEN;
  }, [readyState]);

  // fetch contest data once websocket is connected
  useEffect(() => {
    if (!owner || !name || !isConnected || hasFetchedContest.current) {
      return;
    }

    (async () => {
      try {
        await dispatch(fetchContestByOwnerAndName({ owner, name })).unwrap();
        hasFetchedContest.current = true;
      } catch (err) {
        console.error('Failed to fetch contest:', err);
      }
    })();
  }, [owner, name, dispatch, isConnected]);

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

  // show error toast and clear from store
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      dispatch(clearError());
    }
  }, [dispatch, error, showToast]);

  // show skeleton while connecting or loading contest data
  if (isConnecting || !isConnected || !currentContest) {
    return <ContestPageSkeleton />;
  }

  // show error if contest not found after fetch
  if (!currentContest && hasFetchedContest.current) {
    return <GenericErrorDisplay />;
  }

  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      {/* connection status indicator chip */}
      <Chip
        label={isConnected ? 'Live' : 'Connecting'}
        color={isConnected ? 'success' : 'warning'}
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
