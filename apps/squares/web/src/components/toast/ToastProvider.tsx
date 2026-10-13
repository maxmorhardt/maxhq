import { useSelector } from 'react-redux';
import { selectToastMessages } from '../../features/toast/toastSelectors';
import type { ToastMessage } from '../../features/toast/toastSlice';
import { useToast } from '../../hooks/useToast';
import { Toast } from './Toast';

// one toast at a time, oldest first; closing it shows the next one in the queue
export function ToastProvider() {
  const messages: ToastMessage[] = useSelector(selectToastMessages);
  const { hideToast } = useToast();

  const current = messages[0];
  if (!current) {
    return null;
  }

  return (
    <Toast
      key={current.id}
      open={true}
      message={current.message}
      severity={current.severity}
      onClose={() => hideToast(current.id)}
      autoHideDuration={current.duration}
    />
  );
}
