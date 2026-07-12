import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../app/store';
import { addToast, removeToast } from '../features/toast/toastSlice';

export function useToast() {
  const dispatch = useDispatch<AppDispatch>();

  const showToast = useCallback(
    (
      message: string,
      severity: 'error' | 'warning' | 'info' | 'success' = 'info',
      duration?: number
    ) => {
      dispatch(addToast({ message, severity, duration }));
    },
    [dispatch]
  );

  const hideToast = useCallback(
    (id: string) => {
      dispatch(removeToast(id));
    },
    [dispatch]
  );

  return {
    showToast,
    hideToast,
  };
}
