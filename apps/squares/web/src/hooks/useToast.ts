import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../app/store';
import { addToast, removeToast } from '../features/toast/toastSlice';

export function useToast() {
  const dispatch = useDispatch<AppDispatch>();

  const showToast = (
    message: string,
    severity: 'error' | 'warning' | 'info' | 'success' = 'info',
    duration?: number
  ) => {
    dispatch(addToast({ message, severity, duration }));
  };

  const hideToast = (id: string) => {
    dispatch(removeToast(id));
  };

  return {
    showToast,
    hideToast,
  };
}
