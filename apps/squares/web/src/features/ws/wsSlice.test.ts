import { describe, it, expect } from 'vitest';
import {
  wsReducer,
  clearError,
  setConnectionDetails,
  setLatestMessage,
  setDisconnectionDetails,
  setError,
} from './wsSlice';
import type { WSUpdate } from '../../types/contest';

const initialState = {
  connectionId: null as string | null,
  lastMessage: null as WSUpdate | null,
  error: null as string | null,
};

const mockMessage: WSUpdate = {
  type: 'connected',
  contestId: 'c1',
  connectionId: 'conn-123',
  updatedBy: 'system',
  timestamp: '2024-01-01T00:00:00Z',
};

describe('wsSlice', () => {
  it('should return initial state', () => {
    const state = wsReducer(undefined, { type: 'unknown' });
    expect(state.connectionId).toBeNull();
    expect(state.lastMessage).toBeNull();
    expect(state.error).toBeNull();
  });

  it('clearError should set error to null', () => {
    const state = wsReducer({ ...initialState, error: 'ws error' }, clearError());
    expect(state.error).toBeNull();
  });

  it('setConnectionDetails should store connectionId and message', () => {
    const state = wsReducer(initialState, setConnectionDetails(mockMessage));
    expect(state.connectionId).toBe('conn-123');
    expect(state.lastMessage).toEqual(mockMessage);
  });

  it('setConnectionDetails handles missing connectionId', () => {
    const msg = { ...mockMessage, connectionId: undefined };
    const state = wsReducer(initialState, setConnectionDetails(msg));
    expect(state.connectionId).toBeNull();
  });

  it('setLatestMessage should store message', () => {
    const squareMsg: WSUpdate = { ...mockMessage, type: 'square_update' };
    const state = wsReducer(initialState, setLatestMessage(squareMsg));
    expect(state.lastMessage).toEqual(squareMsg);
  });

  it('setDisconnectionDetails should clear connectionId and store message', () => {
    const disconnectMsg: WSUpdate = {
      ...mockMessage,
      type: 'disconnected',
      connectionId: undefined,
    };
    const state = wsReducer(
      { ...initialState, connectionId: 'conn-123' },
      setDisconnectionDetails(disconnectMsg)
    );
    expect(state.connectionId).toBeNull();
    expect(state.lastMessage).toEqual(disconnectMsg);
  });

  it('setError should set error string', () => {
    const state = wsReducer(initialState, setError('connection lost'));
    expect(state.error).toBe('connection lost');
  });

  it('setError with null should clear error', () => {
    const state = wsReducer({ ...initialState, error: 'old' }, setError(null));
    expect(state.error).toBeNull();
  });
});
