import { useAppSelector } from '../../app/hooks';
import { Toast } from './Toast';
import { selectToastMessages } from './toastSelectors';
import { useToast } from './useToast';

// one toast at a time, oldest first; closing it shows the next one in the queue
export default function ToastHost() {
  const messages = useAppSelector(selectToastMessages);
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
