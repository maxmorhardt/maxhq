import { Edit } from '@mui/icons-material';
import { Box, Chip, CircularProgress, IconButton, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useParams } from 'react-router-dom';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import GenericErrorDisplay from '../../../components/common/GenericErrorDisplay';
import ContestComponent from '../../../components/contest/Contest';
import EditContest from '../../../components/contest/EditContest';
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
  const { showToast } = useToast();
  const lastProcessedMessageRef = useRef<string | null>(null);
  const { id } = useParams<{ id: string }>();
  const [editModalOpen, setEditModalOpen] = useState(false);
	const [dispatchCalled, setDispatchCalled] = useState(false);

  const loading = useAppSelector(selectContestLoading);
  const error = useAppSelector(selectContestError);
  const currentContest = useAppSelector(selectCurrentContest);

  const isOwner = auth.user?.profile?.preferred_username === currentContest?.owner;

  const immutable = useMemo(() => {
    if (!currentContest) {
      return true;
    }

    // For now, you can manually control immutability
    // Later, when you add status to Contest type, uncomment below:
    // const immutableStatuses = ['LOCKED', 'Q1', 'Q2', 'Q3', 'Q4', 'FINISHED'];
    // return immutableStatuses.includes(currentContest.status || '');

    // For demonstration: always mutable (you can change this to true to test)
    return false;
  }, [currentContest]);

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
      onConnect: (message) => {
        dispatch(setConnectionDetails(message));
      },
      onDisconnect: (message) => {
        dispatch(setDisconnectionDetails(message));
      },
    });
  }, [lastMessage, dispatch, currentContest?.id, showToast]);

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
    return (
      <Box display="flex" justifyContent="center" mt={24}>
        <CircularProgress />
      </Box>
    );
  }

  if (dispatchCalled && !loading && !currentContest) {
    return <GenericErrorDisplay />;
  }

  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
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

      {/* Edit button for contest owner */}
      {isOwner && (
        <IconButton
          onClick={() => setEditModalOpen(true)}
          sx={{
            position: 'absolute',
            top: 0,
            left: 14,
            color: 'white',
          }}
          size="small"
        >
          <Edit />
        </IconButton>
      )}

      <ContestComponent immutable={immutable} />

      {/* Edit Contest Modal */}
      <EditContest
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
      />
    </Box>
  );
}
