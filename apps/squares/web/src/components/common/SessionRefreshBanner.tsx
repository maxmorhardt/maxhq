import { Alert, Box, LinearProgress, Snackbar, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

export type RefreshState = 'idle' | 'refreshing' | 'success' | 'error';

interface Props {
  state: RefreshState;
}

export default function SessionRefreshBanner({ state }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state === 'refreshing') {
      setOpen(true);
    }
  }, [state]);

  useEffect(() => {
    if (state === 'success' || state === 'error') {
      const t = setTimeout(() => setOpen(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state]);

  if (state === 'idle') return null;

  const severity = state === 'error' ? 'error' : state === 'success' ? 'success' : 'info';
  const message =
    state === 'refreshing'
      ? 'Refreshing your session…'
      : state === 'success'
        ? 'Welcome back!'
        : 'Session expired. Please sign in again.';

  return (
    <Snackbar open={open} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity={severity} variant="filled" sx={{ minWidth: 260 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {message}
        </Typography>
        {state === 'refreshing' && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress color="inherit" sx={{ borderRadius: 1, opacity: 0.7 }} />
          </Box>
        )}
      </Alert>
    </Snackbar>
  );
}
