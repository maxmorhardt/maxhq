import type { useAuth } from 'react-oidc-context';
import type { WSUpdate } from '../types/contest';
import type { HandleWSEventParams } from '../types/ws';

// construct websocket url for contest connection
export function getSocketUrl(id: string | undefined, auth: ReturnType<typeof useAuth>) {
  if (!id || !auth.user?.access_token) {
    return null;
  }

  const baseURL = import.meta.env.PROD ? 'wss://squares-api.maxstash.io' : 'ws://localhost:8080';
  return `${baseURL}/ws/contests/${id}`;
}

// route websocket messages to appropriate handlers
export function contestSocketEventHandler(eventParams: HandleWSEventParams) {
  if (!eventParams.lastMessage?.data) {
    return;
  }

  // parse json message and route to handler based on type
  try {
    const message: WSUpdate = JSON.parse(eventParams.lastMessage.data);

    switch (message.type) {
      case 'square_update':
        eventParams.onSquareUpdate(message);
        break;

      case 'contest_update':
        eventParams.onContestUpdate(message);
        break;

      case 'quarter_result_update':
        eventParams.onQuarterResultUpdate(message);
        break;

      case 'contest_deleted':
        eventParams.onContestDeleted(message);
        break;

      case 'connected':
        eventParams.onConnect(message);
        break;

      case 'disconnect':
        eventParams.onDisconnect(message);
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
        break;
    }
  } catch {
    // log parsing errors without crashing
    console.error('Error parsing WebSocket message:', eventParams.lastMessage.data);
  }
}
