import type { useAuth } from 'react-oidc-context';
import type { HandleWSEventParams } from '../types/ws';
import type { WSUpdate } from '../types/contest';

export function getSocketUrl(id: string | undefined, auth: ReturnType<typeof useAuth>) {
  if (!id || !auth.user?.access_token) {
    return null;
  }

  const baseURL = import.meta.env.PROD ? 'wss://squares-api.maxstash.io' : 'ws://localhost:8080';
  return `${baseURL}/ws/contests/${id}`;
}

export function contestSocketEventHandler(eventParams: HandleWSEventParams) {
  if (!eventParams.lastMessage?.data) {
    return;
  }

  try {
    const message: WSUpdate = JSON.parse(eventParams.lastMessage.data);
    console.log('WebSocket message received:', message);
    switch (message.type) {
      case 'square_update':
        eventParams.onSquareUpdate(message);
        break;

      case 'contest_update':
        eventParams.onContestUpdate(message);
        break;

      case 'connected':
        break;

      case 'disconnect':
        if (eventParams.onDisconnect) {
          eventParams.onDisconnect(message);
        }
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
        break;
    }
  } catch {
    console.error('Error parsing WebSocket message:', eventParams.lastMessage.data);
  }
}
