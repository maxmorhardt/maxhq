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
import { useState } from 'react';
import { removeContestParticipant } from '../../features/contests/contestThunks';
import { useAppDispatch } from '../../hooks/reduxHooks';
import type { APIError } from '../../types/error';

interface LeaveContestProps {
  open: boolean;
  onClose: () => void;
  contest: { id: string; name: string } | null;
  userEmail: string;
  onLeft?: () => void;
}

export default function LeaveContest({ open, onClose, contest, userEmail, onLeft }: LeaveContestProps) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!contest) {
    return null;
  }

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await dispatch(
        removeContestParticipant({ contestId: contest.id, userId: userEmail })
      ).unwrap();
      onLeft?.();
      onClose();
    } catch (err) {
      setError((err as APIError)?.message ?? 'Failed to leave the contest. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <IconButton
          onClick={handleClose}
          disabled={loading}
          sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
        >
          <Close />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Warning sx={{ color: '#ff4444', fontSize: '2rem' }} />
          <Typography
            variant="h5"
            sx={{ color: 'white', fontWeight: 600, fontSize: { xs: '1.25rem', md: '1.5rem' } }}
          >
            Leave Contest
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography
          sx={{ color: 'white', opacity: 0.8, fontSize: { xs: '0.875rem', md: '1rem' }, mb: 2 }}
        >
          Are you sure you want to leave <strong>{contest.name}</strong>? Your claimed squares will
          be released and you'll need a new invite to rejoin.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" disabled={loading} sx={{ minWidth: 100 }}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={loading}
          sx={{ minWidth: 100 }}
        >
          {loading ? <CircularProgress size={16} color="inherit" /> : 'Leave'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
