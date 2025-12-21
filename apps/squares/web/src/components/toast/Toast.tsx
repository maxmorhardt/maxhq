import { Alert, Snackbar } from '@mui/material';

interface ToastProps {
  open: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  onClose: () => void;
  autoHideDuration?: number;
}

export function Toast({ open, message, severity, onClose, autoHideDuration = 3000 }: ToastProps) {
  return (
    // snackbar notification with auto-hide
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      {/* filled alert with message and close button */}
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
