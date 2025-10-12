import { useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info' | 'success';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showToast = (
    message: string,
    severity: 'error' | 'warning' | 'info' | 'success' = 'info'
  ) => {
    setToast({ open: true, message, severity });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  return {
    toast,
    showToast,
    hideToast,
  };
}
