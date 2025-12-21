import { useSelector } from 'react-redux';
import { selectToastMessages } from '../../features/toast/toastSelectors';
import type { ToastMessage } from '../../features/toast/toastSlice';
import { useToast } from '../../hooks/useToast';
import { Toast } from './Toast';

export function ToastProvider() {
  // get all active toast messages from redux
  const messages: ToastMessage[] = useSelector(selectToastMessages);
  const { hideToast } = useToast();

  return (
    <>
      {/* render all active toast notifications */}
      {messages.map((message) => (
        <Toast
          key={message.id}
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
