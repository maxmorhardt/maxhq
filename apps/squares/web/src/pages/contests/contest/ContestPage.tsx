import { Box, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate, useParams } from 'react-router-dom';
import ActivityFeed from '../../../components/contest/sidebar/ActivityFeed';
import ContestComponent from '../../../components/contest/grid/Contest';
import ContestDetails from '../../../components/contest/details/ContestDetails';
import ContestPageSkeleton from '../../../components/contest/ContestPageSkeleton';
import LoadingScreen from '../../../components/common/LoadingScreen';
import ContestError from '../../../components/contest/ContestError';
import WinnerCelebrationDialog from '../../../components/contest/WinnerCelebrationDialog';
import NotFoundPage from '../../error/NotFoundPage';
import ForbiddenPage from '../../error/ForbiddenPage';
import UnauthorizedPage from '../../error/UnauthorizedPage';
import SignInDialog from '../../../components/auth/SignInDialog';
import LiveChat from '../../../components/contest/sidebar/LiveChat';
import WinnersBoard from '../../../components/contest/sidebar/WinnersBoard';
import {
  selectCurrentContest,
  selectSquareErrorCode,
} from '../../../features/contests/contestSelectors';
import { clearSquareErrorCode } from '../../../features/contests/contestSlice';
import { claimSquare, clearMySquares } from '../../../features/contests/contestThunks';
import { selectDefaultInitials } from '../../../features/user/userSelectors';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useContestWebSocket } from '../../../hooks/useContestWebSocket';
import { useToast } from '../../../hooks/useToast';
import { CONTEST_STACK_MAX_WIDTH } from '../../../types/layout';
import { Helmet } from 'react-helmet-async';

export default function ContestPage() {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { id } = useParams<{ id: string }>();

  const currentContest = useAppSelector(selectCurrentContest);
  const squareErrorCode = useAppSelector(selectSquareErrorCode);
  const defaultInitials = useAppSelector(selectDefaultInitials);

  const [randomSquareLoading, setRandomSquareLoading] = useState(false);
  const [clearMySquaresLoading, setClearMySquaresLoading] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [newWinnerSquare, setNewWinnerSquare] = useState<{ row: number; col: number } | null>(null);
  const [winnerDialog, setWinnerDialog] = useState<{
    quarter: number;
    homeScore: number;
    awayScore: number;
    row: number;
    col: number;
  } | null>(null);

  const isOwner = auth.user?.profile?.email === currentContest?.owner;

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

  const onParticipantRemoved = useCallback(
    (isCurrentUser: boolean, isPrivate: boolean) => {
      if (!isCurrentUser) {
        return;
      }

      const severity = isPrivate ? 'warning' : 'info';
      showToast('You have been removed from this contest', severity);

      if (isPrivate) {
        navigate('/contests');
      }
    },
    [showToast, navigate]
  );

  const {
    activityEvents,
    chatMessages,
    sendChatMessage,
    isConnected,
    isConnecting,
    connectionFailed,
    wsCloseCode,
    hasFatalWsError,
    forceReconnect,
  } = useContestWebSocket({
    id,
    onContestDeleted,
    onParticipantRemoved,
    onWinnerSquare,
    onWinnerDialog,
  });

  // on 409 conflict, our local state is stale — reconnect to get fresh data
  useEffect(() => {
    if (squareErrorCode === 409) {
      dispatch(clearSquareErrorCode());
      forceReconnect();
    }
  }, [squareErrorCode, dispatch, forceReconnect]);

  const handleRandomSquare = async () => {
    if (!auth.isAuthenticated) {
      setSignInOpen(true);
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

    // claim uses the profile default initials, so require them to be set first
    if (!defaultInitials) {
      showToast('Set your initials in your profile before claiming a square', 'warning');
      navigate('/profile');
      return;
    }

    setRandomSquareLoading(true);
    try {
      await dispatch(
        claimSquare({
          contestId: currentContest.id,
          squareId: randomSquare.id,
        })
      ).unwrap();
    } finally {
      setRandomSquareLoading(false);
    }
  };

  const handleClearMySquares = async () => {
    if (!currentContest || currentContest.status !== 'ACTIVE') {
      return;
    }

    setClearMySquaresLoading(true);
    try {
      await dispatch(clearMySquares({ contestId: currentContest.id })).unwrap();
    } finally {
      setClearMySquaresLoading(false);
    }
  };

  // show redirecting component while signin redirect is in progress
  if (auth.isLoading && auth.activeNavigator === 'signinRedirect') {
    return (
      <LoadingScreen title="Redirecting to sign in..." subtitle="You will be redirected shortly" />
    );
  }

  // prompt unauthenticated users to sign in
  if (!auth.isLoading && !auth.isAuthenticated) {
    return <UnauthorizedPage />;
  }

  // show error if connection failed after max retries
  if (connectionFailed) {
    return <ContestError />;
  }

  // handle fatal WS close codes
  if (hasFatalWsError) {
    if (wsCloseCode === 4403) {
      return <ForbiddenPage />;
    }
    if (wsCloseCode === 4404) {
      return <NotFoundPage />;
    }
    return <ContestError />;
  }

  // show skeleton while connecting or loading contest data
  if (isConnecting || !isConnected || !currentContest) {
    return <ContestPageSkeleton />;
  }

  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      <Helmet>
        <title>{`${currentContest.name} – Squares`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* contest name heading */}
      <Box sx={{ position: 'relative', mt: { xs: 1.5, sm: 2 }, mb: { xs: 0.5, sm: 1 }, px: 5 }}>
        <Typography
          sx={{
            fontSize: { xs: '1rem', sm: '1.5rem', md: '1.7rem' },
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
          <ContestDetails
            isOwner={isOwner}
            onRandomSquare={handleRandomSquare}
            randomSquareLoading={randomSquareLoading}
            onClearMySquares={handleClearMySquares}
            clearMySquaresLoading={clearMySquaresLoading}
          />
          <LiveChat
            messages={chatMessages}
            onSend={sendChatMessage}
            currentUser={auth.user?.profile?.email as string}
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
          maxWidth: CONTEST_STACK_MAX_WIDTH,
          margin: '0 auto',
          p: 1,
          mb: 3,
          mt: 2,
        }}
      >
        <ContestDetails
          isOwner={isOwner}
          onRandomSquare={handleRandomSquare}
          randomSquareLoading={randomSquareLoading}
          onClearMySquares={handleClearMySquares}
          clearMySquaresLoading={clearMySquaresLoading}
        />
        <WinnersBoard quarterResults={currentContest?.quarterResults} />
        <LiveChat
          messages={chatMessages}
          onSend={sendChatMessage}
          currentUser={auth.user?.profile?.email as string}
          disabled={!auth.isAuthenticated || !isConnected}
        />
        <ActivityFeed events={activityEvents} />
      </Box>

      {/* winner celebration dialog */}
      <WinnerCelebrationDialog data={winnerDialog} onClose={() => setWinnerDialog(null)} />

      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </Box>
  );
}
