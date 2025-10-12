import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useParams } from 'react-router-dom';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import Contest from '../../components/contest/Contest';
import {
  selectContestError,
  selectContestLoading,
  selectCurrentContest,
} from '../../features/contests/contestSelectors';
import {
  clearError,
  updateContestFromWebSocket,
  updateSquareFromWebSocket,
} from '../../features/contests/contestSlice';
import { fetchContestById, randomizeLabels } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useToast } from '../../hooks/useToast';
import { contestSocketEventHandler, getSocketUrl } from '../../service/wsService';

export default function ContestPage() {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const { id } = useParams<{ id: string }>();

  const { lastMessage, readyState } = useWebSocket(getSocketUrl(id, auth), {
    protocols: auth.user?.access_token ? [auth.user.access_token] : undefined,
    reconnectAttempts: auth.isAuthenticated ? 5 : 0,
    reconnectInterval: 5000,
  });

	const isConnected = readyState === ReadyState.OPEN;
  const isConnecting = readyState === ReadyState.CONNECTING;

  const loading = useAppSelector(selectContestLoading);
  const error = useAppSelector(selectContestError);
  const currentContest = useAppSelector(selectCurrentContest);

  useEffect(() => {
    contestSocketEventHandler({
      lastMessage,
      onSquareUpdate: (message) => {
        if (
          message.squareId &&
          message.contestId === currentContest?.id &&
          message.value !== undefined
        ) {
          dispatch(
            updateSquareFromWebSocket({
              id: message.squareId,
              value: message.value,
            })
          );
        }
      },
      onContestUpdate: (message) => {
        if (
          message.contestId === currentContest?.id &&
          message.xLabels !== undefined &&
          message.yLabels !== undefined
        ) {
          dispatch(
            updateContestFromWebSocket({
              xLabels: message.xLabels,
              yLabels: message.yLabels,
            })
          );
        }
      },
    });
  }, [lastMessage, dispatch, currentContest?.id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    dispatch(fetchContestById(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      dispatch(clearError());
    }
  }, [dispatch, error, showToast]);

	const handleRandomizeLabels = async () => {
    if (!id) {
      return;
    }

    dispatch(randomizeLabels(id));
  };

  const handleChooseWinner = () => {
    showToast('Choose winner feature coming soon!', 'info');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentContest) {
    return;
  }

  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      <Typography
        sx={{
          fontSize: { xs: '1rem', sm: '1.5rem', md: '2rem' },
          fontWeight: 700,
          textAlign: 'center',
          flex: 1,
          mt: 2,
          mb: 1,
        }}
      >
        {currentContest.name}
      </Typography>

      <Chip
        label={isConnected ? 'Live' : isConnecting ? 'Connecting' : 'Offline'}
        color={isConnected ? 'success' : isConnecting ? 'warning' : 'default'}
        size="small"
        variant={isConnected ? 'filled' : 'outlined'}
        sx={{
          position: 'absolute',
          top: 0,
          right: 14,
        }}
      />

      <Contest />

      <Box sx={{ mt: 4, mb: 4 }}>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="outlined"
            onClick={handleRandomizeLabels}
            disabled={loading}
            sx={{
              minWidth: { xs: 120, sm: 140 },
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
            }}
          >
            Randomize Labels
          </Button>

          <Button
            variant="contained"
            onClick={handleChooseWinner}
            disabled={loading}
            sx={{
              minWidth: { xs: 120, sm: 140 },
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
            }}
          >
            Choose Winner
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
