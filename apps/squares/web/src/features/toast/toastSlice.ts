import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// toast notification message
export interface ToastMessage {
  id: string;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  duration?: number;
}

// redux state for toast notifications
interface ToastState {
  messages: ToastMessage[]; // active toast messages
}

const initialState: ToastState = {
  messages: [],
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    // add new toast message with auto-generated id
    addToast: (state, action: PayloadAction<Omit<ToastMessage, 'id'>>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      state.messages.push({
        ...action.payload,
        id,
        duration: action.payload.duration ?? 3000,
      });
    },
    // remove toast by id
    removeToast: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter((msg) => msg.id !== action.payload);
    },
    // clear all active toasts
    clearAllToasts: (state) => {
      state.messages = [];
    },
  },
});

export const { addToast, removeToast, clearAllToasts } = toastSlice.actions;
export const toastReducer = toastSlice.reducer;
