import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../app/store';
import { addToast, removeToast } from '../features/toast/toastSlice';

// hook for displaying and dismissing toast notifications
export function useToast() {
  const dispatch = useDispatch<AppDispatch>();

  // display a toast notification with message and severity
  const showToast = (
    message: string,
    severity: 'error' | 'warning' | 'info' | 'success' = 'info',
    duration?: number
  ) => {
    dispatch(addToast({ message, severity, duration }));
  };

  // dismiss a specific toast by id
  const hideToast = (id: string) => {
    dispatch(removeToast(id));
  };

  return {
    showToast,
    hideToast,
  };
}
