import { Alert, Box, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate, useParams } from 'react-router-dom';
import ActivityFeed from '../../../components/contest/sidebar/ActivityFeed';
import ConnectionChip from '../../../components/contest/ConnectionChip';
import ContestComponent from '../../../components/contest/grid/Contest';
import ContestDetails from '../../../components/contest/details/ContestDetails';
import ContestPageSkeleton from '../../../components/contest/ContestPageSkeleton';
import GenericErrorDisplay from '../../../components/contest/GenericErrorDisplay';
import WinnerCelebrationDialog from '../../../components/contest/WinnerCelebrationDialog';
import NotFoundPage from '../../error/NotFoundPage';
import ForbiddenPage from '../../error/ForbiddenPage';
import UnauthorizedPage from '../../error/UnauthorizedPage';
import RedirectingToLogin from '../../../components/common/RedirectingToLogin';
import LiveChat from '../../../components/contest/sidebar/LiveChat';
import WinnersBoard from '../../../components/contest/sidebar/WinnersBoard';
import {
  selectCurrentContest,
  selectParticipants,
} from '../../../features/contests/contestSelectors';
import { updateSquare } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useContestWebSocket } from '../../../hooks/useContestWebSocket';
import { useToast } from '../../../hooks/useToast';

export default function ContestPage() {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { owner, name } = useParams<{ owner: string; name: string }>();

  const currentContest = useAppSelector(selectCurrentContest);

  const [newWinnerSquare, setNewWinnerSquare] = useState<{ row: number; col: number } | null>(null);
  const [winnerDialog, setWinnerDialog] = useState<{
    quarter: number;
    homeScore: number;
    awayScore: number;
    row: number;
    col: number;
  } | null>(null);

  const isOwner = auth.user?.profile?.preferred_username === currentContest?.owner;
  const participants = useAppSelector(selectParticipants);
  const currentUsername = auth.user?.profile?.preferred_username;
  const currentParticipant = participants.find((p) => p.userId === currentUsername);
  const isParticipant = !!currentParticipant;
  const squaresClaimed =
    currentContest?.squares?.filter((s) => s.owner === currentUsername).length ?? 0;
  const isPublicContest = currentContest?.visibility === 'public';

  const onContestDeleted = useCallback(() => {
    showToast('Contest has been deleted', 'warning');
    if (!auth.isAuthenticated) {
      navigate('/');
    } else {
      navigate('/contests');
    }
  }, [showToast, auth.isAuthenticated, navigate]);

  const onWinnerSquare = useCallback((row: number, col: number) => {
    setNewWinnerSquare({ row, col });
    setTimeout(() => setNewWinnerSquare(null), 2000);
  }, []);

  const onWinnerDialog = useCallback(
    (data: { quarter: number; homeScore: number; awayScore: number; row: number; col: number }) => {
      setWinnerDialog(data);
    },
    []
  );

  const {
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
    hasFetchedContest,
  } = useContestWebSocket({
    owner,
    name,
    onContestDeleted,
    onWinnerSquare,
    onWinnerDialog,
  });

  const handleRandomSquare = () => {
    if (!auth.isAuthenticated) {
      sessionStorage.setItem('auth_redirect_path', window.location.href);
      auth.signinRedirect();
      return;
    }

    if (!currentContest || currentContest.status !== 'ACTIVE') {
      return;
    }

    const emptySquares = currentContest.squares.filter((s) => !s.value || s.value.trim() === '');

    if (emptySquares.length === 0) {
      showToast('No empty squares available', 'info');
      return;
    }

    const randomSquare = emptySquares[Math.floor(Math.random() * emptySquares.length)];
    const username = auth.user?.profile?.preferred_username;
    const name = auth.user?.profile?.name || '';
    const parts = name.trim().split(/\s+/);
    let initials = '';
    for (let i = 0; i < parts.length && initials.length < 3; i++) {
      initials += parts[i].charAt(0).toUpperCase();
    }

    if (!username || !initials) {
      showToast('Unable to determine your initials', 'error');
      return;
    }

    dispatch(
      updateSquare({
        contestId: currentContest.id,
        squareId: randomSquare.id,
        value: initials,
        owner: username,
      })
    );
  };

  // show redirecting component while signin redirect is in progress
  if (auth.isLoading && auth.activeNavigator === 'signinRedirect') {
    return <RedirectingToLogin />;
  }

  // prompt unauthenticated users to sign in (skip loading state during silent sign-out)
  if ((!auth.isLoading && !auth.isAuthenticated) || auth.activeNavigator === 'signoutSilent') {
    return <UnauthorizedPage />;
  }

  // handle HTTP errors from contest fetch
  if (fetchErrorCode === 401) {
    return <UnauthorizedPage />;
  }
  if (fetchErrorCode === 403) {
    return <ForbiddenPage />;
  }
  if (fetchErrorCode === 404) {
    return <NotFoundPage />;
  }
  if (fetchErrorCode && fetchErrorCode >= 400) {
    return <GenericErrorDisplay />;
  }

  // show error if connection failed after max retries
  if (connectionFailed) {
    return <GenericErrorDisplay />;
  }

  // handle fatal WS close codes
  if (hasFatalWsError) {
    if (wsCloseCode === 4404) {
      return <NotFoundPage />;
    }
    return <GenericErrorDisplay />;
  }

  // show error if contest not found after fetch
  if (!currentContest && hasFetchedContest) {
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

      {/* square limit counter for participants */}
      {auth.isAuthenticated && currentParticipant && currentParticipant.role !== 'owner' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Alert
            severity={squaresClaimed >= currentParticipant.maxSquares ? 'warning' : 'info'}
            sx={{ minWidth: { xs: '22rem', sm: '35rem', md: '40rem' } }}
          >
            {squaresClaimed}/{currentParticipant.maxSquares} squares claimed
            {squaresClaimed >= currentParticipant.maxSquares && ' — limit reached'}
          </Alert>
        </Box>
      )}

      {/* non-participant banner for public contests */}
      {auth.isAuthenticated && isPublicContest && !isParticipant && !isOwner && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Alert severity="info" sx={{ minWidth: { xs: '22rem', sm: '35rem', md: '40rem' } }}>
            You're viewing this contest. Get an invite link to participate.
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
          <ContestDetails isOwner={isOwner} onRandomSquare={handleRandomSquare} />
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
        <ContestDetails isOwner={isOwner} onRandomSquare={handleRandomSquare} />
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
      <WinnerCelebrationDialog data={winnerDialog} onClose={() => setWinnerDialog(null)} />
    </Box>
  );
}
