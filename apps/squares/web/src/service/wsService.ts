import type { useAuth } from 'react-oidc-context';
import {
  updateContestFromWebSocket,
  updateQuarterResultFromWebSocket,
  updateSquareFromWebSocket,
} from '../features/contests/contestSlice';
import {
  setConnectionDetails,
  setDisconnectionDetails,
  setLatestMessage,
} from '../features/ws/wsSlice';
import type { WSUpdate } from '../types/contest';
import type { HandleWSEventParams } from '../types/ws';

export function getSocketUrl(
  owner: string | undefined,
  name: string | undefined,
  auth: ReturnType<typeof useAuth>
) {
  if (!owner || !name || !auth.user?.access_token) {
    return null;
  }

  const baseURL = import.meta.env.PROD ? 'wss://squares-api.maxstash.io' : 'ws://localhost:8080';
  return `${baseURL}/ws/contests/owner/${owner}/name/${name}`;
}

export function contestSocketEventHandler(eventParams: HandleWSEventParams) {
  const { lastMessage, dispatch, currentContestId, lastProcessedMessageRef, callbacks } =
    eventParams;

  if (!lastMessage?.data) {
    return;
  }

  // prevent duplicate message processing
  if (lastProcessedMessageRef.current === lastMessage.data) {
    return;
  }

  lastProcessedMessageRef.current = lastMessage.data;

  // parse and validate json message
  let message: WSUpdate;
  try {
    const parsed = JSON.parse(lastMessage.data);
    if (!isValidWSUpdate(parsed)) {
      console.error('Invalid WebSocket message structure:', parsed);
      callbacks?.onError?.('Received invalid message from server');
      return;
    }
    message = parsed;
  } catch (error) {
    console.error('Error parsing WebSocket message:', lastMessage.data, error);
    callbacks?.onError?.('Failed to parse server message');
    return;
  }

  // validate message belongs to current contest
  if (message.contestId !== currentContestId) {
    console.warn('Received message for different contest:', message.contestId);
    return;
  }

  // route message to appropriate handler and dispatch redux actions
  switch (message.type) {
    case 'square_update':
      if (isValidSquareUpdate(message)) {
        dispatch(
          updateSquareFromWebSocket({
            id: message.square!.id,
            value: message.square!.value,
          })
        );
        dispatch(setLatestMessage(message));
        callbacks?.onSquareUpdate?.(
          message.square!.value,
          message.square!.row,
          message.square!.col,
          message.square!.ownerName
        );
      }
      break;

    case 'contest_update':
      if (isValidContestUpdate(message)) {
        dispatch(
          updateContestFromWebSocket({
            xLabels: message.contest!.xLabels,
            yLabels: message.contest!.yLabels,
            homeTeam: message.contest!.homeTeam,
            awayTeam: message.contest!.awayTeam,
            status: message.contest!.status,
          })
        );
        dispatch(setLatestMessage(message));
        callbacks?.onContestUpdate?.(message.contest!.status);
      }
      break;

    case 'quarter_result_update':
      if (isValidQuarterResultUpdate(message)) {
        dispatch(
          updateQuarterResultFromWebSocket({
            quarter: message.quarterResult!.quarter,
            homeTeamScore: message.quarterResult!.homeTeamScore,
            awayTeamScore: message.quarterResult!.awayTeamScore,
            winnerRow: message.quarterResult!.winnerRow,
            winnerCol: message.quarterResult!.winnerCol,
            winner: message.quarterResult!.winner,
            winnerName: message.quarterResult!.winnerName,
          })
        );
        dispatch(setLatestMessage(message));
        callbacks?.onQuarterResultUpdate?.(
          message.quarterResult!.quarter,
          message.quarterResult!.winnerName,
          message.quarterResult!.homeTeamScore,
          message.quarterResult!.awayTeamScore
        );
      }
      break;

    case 'contest_deleted':
      callbacks?.onContestDeleted?.();
      break;

    case 'chat_message':
      if (message.message && message.updatedBy) {
        callbacks?.onChatMessage?.(message.updatedBy, message.message, message.timestamp);
      }
      break;

    case 'connected':
      dispatch(setConnectionDetails(message));
      break;

    case 'disconnected':
      dispatch(setDisconnectionDetails(message));
      break;

    default:
      console.error('Unknown WebSocket message type:', (message as WSUpdate).type);
      break;
  }
}

function isValidWSUpdate(data: unknown): data is WSUpdate {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const msg = data as WSUpdate;
  return (
    typeof msg.type === 'string' &&
    typeof msg.contestId === 'string' &&
    typeof msg.timestamp === 'string' &&
    typeof msg.updatedBy === 'string'
  );
}

function isValidSquareUpdate(message: WSUpdate): boolean {
  return (
    message.type === 'square_update' && !!message.square?.id && message.square.value !== undefined
  );
}

function isValidContestUpdate(message: WSUpdate): boolean {
  return message.type === 'contest_update' && !!message.contest;
}

function isValidQuarterResultUpdate(message: WSUpdate): boolean {
  return message.type === 'quarter_result_update' && !!message.quarterResult;
}
