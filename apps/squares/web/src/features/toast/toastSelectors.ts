import type { ToastMessage } from './toastSlice';

export const selectToastMessages = (state: {
  toast: { messages: ToastMessage[] };
}): ToastMessage[] => state.toast.messages;
