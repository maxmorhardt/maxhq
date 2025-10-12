import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useParams } from 'react-router-dom';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useAxiosAuth } from '../../axios/api';
import Contest from '../../components/contest/Contest';
import {
  selectContestError,
  selectContestLoading,
  selectCurrentContest,
} from '../../features/contests/contestSelectors';
import { updateSquareFromWebSocket } from '../../features/contests/contestSlice';
import { fetchContestById } from '../../features/contests/contestThunks';
import type { ContestChannelResponse } from '../../types/contest';

export default function ContestPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();
  const dispatch = useAppDispatch();

  const { id } = useParams<{ id: string }>();

  const getSocketUrl = () => {
    if (!id || !auth.user?.access_token) {
      return '';
    }

    const baseURL = import.meta.env.PROD ? 'wss://squares-api.maxstash.io' : 'ws://localhost:8080';
    return `${baseURL}/ws/contests/${id}`;
  };

  const { lastMessage, readyState } = useWebSocket(getSocketUrl() ?? null, {
    protocols: auth.user?.access_token ? [auth.user.access_token] : undefined,
    reconnectAttempts: 5,
    reconnectInterval: 5000,
  });

  const loading = useAppSelector(selectContestLoading);
  const error = useAppSelector(selectContestError);
  const currentContest = useAppSelector(selectCurrentContest);

  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const message: ContestChannelResponse = JSON.parse(lastMessage.data);

        switch (message.type) {
          case 'square_update':
            if (message.squareId && message.contestId === currentContest?.id) {
              dispatch(
                updateSquareFromWebSocket({
                  id: message.squareId,
                  value: message.value,
                })
              );
            }
            break;
        }
      } catch {
        console.error('Error parsing WebSocket message:', lastMessage.data);
      }
    }
  }, [lastMessage, dispatch, currentContest?.id]);

  const isConnected = readyState === ReadyState.OPEN;
  const isConnecting = readyState === ReadyState.CONNECTING;

  const handleRandomizeLabels = () => {
    // TODO: Implement randomize labels functionality
    console.log('Randomize labels clicked');
  };

  const handleChooseWinner = () => {
    // TODO: Implement choose winner functionality
    console.log('Choose winner clicked');
  };

  useEffect(() => {
    if (auth.isAuthenticated && isInterceptorReady && id) {
      dispatch(fetchContestById(id));
    }
  }, [auth.isAuthenticated, isInterceptorReady, id, dispatch]);

  if (!isInterceptorReady || loading) {
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
