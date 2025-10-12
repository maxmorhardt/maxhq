import { useSelector } from 'react-redux';
import { selectToastMessages } from '../../features/toast/toastSelectors';
import type { ToastMessage } from '../../features/toast/toastSlice';
import { useToast } from '../../hooks/useToast';
import { Toast } from './Toast';

export function ToastProvider() {
  const messages: ToastMessage[] = useSelector(selectToastMessages);
  const { hideToast } = useToast();

  return (
    <>
      {messages.map((message) => (
        <Toast
          open={true}
          message={message.message}
          severity={message.severity}
          onClose={() => hideToast(message.id)}
          autoHideDuration={message.duration}
        />
      ))}
    </>
  );
}
