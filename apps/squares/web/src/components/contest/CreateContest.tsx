import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { selectContestLoading } from '../../features/contests/contestSelectors';
import { createContest } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import type { APIError } from '../../types/error';

interface CreateContestProps {
  open: boolean;
  onClose: (id: string) => void;
}

export default function CreateContest({ open, onClose }: CreateContestProps) {
  const auth = useAuth();

  const dispatch = useAppDispatch();

  const loading = useAppSelector(selectContestLoading);

  const [name, setName] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Contest name is required');
      return;
    }

    if (!auth.isAuthenticated || !auth.user) {
      setError('You must be logged in to create a contest');
      return;
    }

    setError('');

    try {
      const contest = await dispatch(
        createContest({
          name: name.trim(),
          homeTeam: homeTeam.trim() ?? null,
          awayTeam: awayTeam.trim() ?? null,
        })
      ).unwrap();
      onClose(contest.id);
    } catch (err: unknown) {
      const apiError = err as APIError;
      setError(apiError.message);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose('')} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 24, fontWeight: 'bold' }}>Create New Contest</DialogTitle>
      <DialogContent>
        {!auth.isAuthenticated && (
          <Typography color="error" sx={{ mb: 2 }}>
            You must be logged in to create a contest
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          <TextField
            label="Contest Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
            disabled={loading}
            required
          />

          <TextField
            label="Home Team (Optional)"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            fullWidth
            disabled={loading}
            placeholder="e.g., Chiefs"
          />

          <TextField
            label="Away Team (Optional)"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            fullWidth
            disabled={loading}
            placeholder="e.g., Bills"
          />

          {error && <Typography color="error">{error}</Typography>}

          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button onClick={() => onClose('')} sx={{ minWidth: 100 }} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={loading || !auth.isAuthenticated}
              sx={{ minWidth: 100, position: 'relative' }}
            >
              {loading ? (
                <CircularProgress size={18} color="inherit" sx={{ marginRight: 1 }} />
              ) : (
                ''
              )}
              Create
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
