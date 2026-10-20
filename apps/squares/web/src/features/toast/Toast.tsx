import { Alert, Snackbar } from '@mui/material';
import type { ToastSeverity } from './toastSlice';

interface ToastProps {
  open: boolean;
  message: string;
  severity: ToastSeverity;
  onClose: () => void;
  autoHideDuration?: number;
}

export function Toast({ open, message, severity, onClose, autoHideDuration = 3000 }: ToastProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{
          color: 'white',
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
