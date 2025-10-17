import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { WSUpdate } from '../../types/contest';

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
    clearError(state) {
      state.error = null;
    },
    setConnectionDetails(state, action: PayloadAction<WSUpdate>) {
      state.connectionId = action.payload.connectionId || null;
      state.lastMessage = action.payload;
    },
    setLatestMessage(state, action: PayloadAction<WSUpdate>) {
      state.lastMessage = action.payload;
    },
    setDisconnectionDetails(state, action: PayloadAction<WSUpdate>) {
      state.connectionId = action.payload.connectionId;
      state.lastMessage = action.payload;
    },
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
