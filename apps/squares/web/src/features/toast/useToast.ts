import { useCallback } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { addToast, removeToast, type ToastSeverity } from './toastSlice';

export function useToast() {
  const dispatch = useAppDispatch();

  const showToast = useCallback(
    (message: string, severity: ToastSeverity = 'info', duration?: number) => {
      dispatch(addToast({ message, severity, duration }));
    },
    [dispatch]
  );

  const hideToast = useCallback((id: string) => dispatch(removeToast(id)), [dispatch]);

  return { showToast, hideToast };
}
