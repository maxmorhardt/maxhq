import { Close, Warning } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
}

// every destructive action asks the same way: what happens, then cancel or confirm
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
  loading = false,
  error = null,
}: Props) {
  const close = loading ? undefined : onClose;

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle component="div" sx={{ pr: 6 }}>
        <IconButton
          aria-label="Close dialog"
          onClick={close}
          disabled={loading}
          sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
        >
          <Close />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Warning sx={{ color: '#ff5d5d', fontSize: '2rem' }} />
          <Typography
            component="h2"
            sx={{ color: 'white', fontWeight: 600, fontSize: { xs: '1.25rem', md: '1.5rem' } }}
          >
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box
          sx={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: { xs: '0.875rem', md: '1rem' },
            lineHeight: 1.5,
            overflowWrap: 'anywhere',
          }}
        >
          {children}
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
          sx={{ minHeight: 35, minWidth: 100 }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={loading}
          sx={{ minHeight: 35, minWidth: 100 }}
        >
          {loading ? <CircularProgress size={16} color="inherit" /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
