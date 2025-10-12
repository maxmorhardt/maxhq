import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useParams } from 'react-router-dom';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import Contest from '../../components/contest/Contest';
import {
  selectContestError,
  selectContestLoading,
  selectCurrentContest,
} from '../../features/contests/contestSelectors';
import { fetchContestById, randomizeLabels } from '../../features/contests/contestThunks';
import { contestSocketEventHandler, getSocketUrl } from '../../service/wsService';
import {
  updateContestFromWebSocket,
  updateSquareFromWebSocket,
} from '../../features/contests/contestSlice';

export default function ContestPage() {
  const auth = useAuth();
  const dispatch = useAppDispatch();

  const { id } = useParams<{ id: string }>();

  const { lastMessage, readyState } = useWebSocket(getSocketUrl(id, auth), {
    protocols: auth.user?.access_token ? [auth.user.access_token] : undefined,
    reconnectAttempts: auth.isAuthenticated ? 5 : 0,
    reconnectInterval: 5000,
  });

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
          message.value !== undefined
        ) {
          dispatch(
            updateContestFromWebSocket({
              xLabels: message.xLabels ?? [],
              yLabels: message.yLabels ?? [],
            })
          );
        }
      },
    });
  }, [lastMessage, dispatch, currentContest?.id]);

  const isConnected = readyState === ReadyState.OPEN;
  const isConnecting = readyState === ReadyState.CONNECTING;

  const handleRandomizeLabels = () => {
    if (!id) {
      return;
    }

    dispatch(randomizeLabels(id));
  };

  const handleChooseWinner = () => {
    console.log('Choose winner clicked');
  };

  useEffect(() => {
    if (!id) {
      return;
    }

    dispatch(fetchContestById(id));
  }, [id, dispatch]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
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
