import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ToastMessage {
  id: string;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  duration?: number;
}

interface ToastState {
  messages: ToastMessage[];
}

const initialState: ToastState = {
  messages: [],
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    addToast: (state, action: PayloadAction<Omit<ToastMessage, 'id'>>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      state.messages.push({
        ...action.payload,
        id,
        duration: action.payload.duration ?? 3000,
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter((msg) => msg.id !== action.payload);
    },
    clearAllToasts: (state) => {
      state.messages = [];
    },
  },
});

export const { addToast, removeToast, clearAllToasts } = toastSlice.actions;
export const toastReducer = toastSlice.reducer;
