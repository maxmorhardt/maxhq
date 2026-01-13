import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { WSUpdate } from '../../types/contest';

// redux state for websocket connection
interface WebSocketState {
  connectionId: string | null;
  lastMessage: WSUpdate | null;
  error: string | null;
}

const initialState: WebSocketState = {
  connectionId: null,
  lastMessage: null,
  error: null,
};

const wsSlice = createSlice({
  name: 'ws',
  initialState,
  reducers: {
    // clear websocket error state
    clearError(state) {
      state.error = null;
    },
    // store connection details when websocket connects
    setConnectionDetails(state, action: PayloadAction<WSUpdate>) {
      state.connectionId = action.payload.connectionId || null;
      state.lastMessage = action.payload;
    },
    // store latest websocket message
    setLatestMessage(state, action: PayloadAction<WSUpdate>) {
      state.lastMessage = action.payload;
    },
    // clear connection details when websocket disconnects
    setDisconnectionDetails(state, action: PayloadAction<WSUpdate>) {
      state.connectionId = action.payload.connectionId || null;
      state.lastMessage = action.payload;
    },
    // set websocket error
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  setConnectionDetails,
  setLatestMessage,
  setDisconnectionDetails,
  setError,
  clearError,
} = wsSlice.actions;
export const wsReducer = wsSlice.reducer;
