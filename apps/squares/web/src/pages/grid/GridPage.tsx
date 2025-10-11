import { Box, CircularProgress, Typography, Chip } from '@mui/material';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useParams } from 'react-router-dom';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useAxiosAuth } from '../../axios/api';
import SquaresGrid from '../../components/grid/SquaresGrid';
import { updateCellFromWebSocket } from '../../features/grids/gridSlice';
import type { GridChannelResponse } from '../../types/grid';
import {
  selectCurrentGrid,
  selectGridError,
  selectGridLoading,
} from '../../features/grids/gridSelectors';
import { fetchGridById } from '../../features/grids/gridThunks';

export default function GridPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();
  const dispatch = useAppDispatch();

  const { id } = useParams<{ id: string }>();

  const getSocketUrl = () => {
    if (!id || !auth.user?.access_token) {
      return '';
    }

    const baseURL = import.meta.env.PROD ? 'wss://squares-api.maxstash.io' : 'ws://localhost:8080';

    return `${baseURL}/ws/grids/${id}`;
  };

  const { lastMessage, readyState } = useWebSocket(getSocketUrl() ?? null, {
    protocols: auth.user?.access_token ? [auth.user.access_token] : undefined,
    reconnectAttempts: 5,
    reconnectInterval: 5000,
  });

  useEffect(() => {
    if (lastMessage?.data) {
      try {
        const message: GridChannelResponse = JSON.parse(lastMessage.data);

        switch (message.type) {
          case 'cell_update':
            if (message.cellId && message.gridId === id) {
              dispatch(
                updateCellFromWebSocket({
                  id: message.cellId,
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
  }, [lastMessage, dispatch, id]);

  const isConnected = readyState === ReadyState.OPEN;
  const isConnecting = readyState === ReadyState.CONNECTING;

  const loading = useAppSelector(selectGridLoading);
  const error = useAppSelector(selectGridError);
  const currentGrid = useAppSelector(selectCurrentGrid);

  useEffect(() => {
    if (auth.isAuthenticated && isInterceptorReady && id) {
      dispatch(fetchGridById(id));
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

  if (!currentGrid) {
    return;
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box
        sx={{
          position: 'relative',
          mb: 2,
          px: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: '1rem', sm: '1.5rem', md: '2rem' },
            fontWeight: 700,
          }}
        >
          {currentGrid.name}
        </Typography>

        <Chip
          label={isConnected ? 'Live' : isConnecting ? 'Connecting' : 'Offline'}
          color={isConnected ? 'success' : isConnecting ? 'warning' : 'default'}
          size="small"
          variant={isConnected ? 'filled' : 'outlined'}
          sx={{
            position: 'absolute',
            top: '50%',
            right: 16,
            transform: 'translateY(-50%)',
          }}
        />
      </Box>

      <SquaresGrid />
    </Box>
  );
}
