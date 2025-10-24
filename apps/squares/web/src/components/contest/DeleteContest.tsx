import { Warning } from '@mui/icons-material';
import {
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Typography
} from '@mui/material';
import {
	selectCurrentContest,
	selectDeleteContestLoading
} from '../../features/contests/contestSelectors';
import { deleteContest } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';

interface DeleteContestProps {
  open: boolean;
  onClose: () => void;
}

export default function DeleteContest({ open, onClose }: DeleteContestProps) {
  const dispatch = useAppDispatch();

  const currentContest = useAppSelector(selectCurrentContest);
  const loading = useAppSelector(selectDeleteContestLoading);

  if (!currentContest) {
    return;
  }

	// errors will be shown in toast from contests page
  const handleConfirm = () => {
    dispatch(deleteContest(currentContest.id))
      .unwrap()
      .then(() => {
        onClose();
      });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Warning
            sx={{
              color: '#ff4444',
              fontSize: '2rem',
            }}
          />
          <Typography
            variant="h5"
            sx={{
              color: 'white',
              fontWeight: 600,
              fontSize: { xs: '1.25rem', md: '1.5rem' },
            }}
          >
            Delete Confirmation
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography
          sx={{
            color: 'white',
            opacity: 0.8,
            fontSize: { xs: '0.875rem', md: '1rem' },
            lineHeight: 1.5,
            mb: currentContest.name ? 2 : 0,
          }}
        >
          Are you sure you want to delete this contest? This action cannot be undone.
        </Typography>

        {currentContest.name && (
          <Box
            sx={{
              background: 'rgba(255,68,68,0.1)',
              border: '1px solid rgba(255,68,68,0.3)',
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography
              sx={{
                color: '#ff6b6b',
                fontWeight: 500,
                fontSize: { xs: '0.875rem', md: '1rem' },
              }}
            >
              Contest to delete: <strong>{currentContest.name}</strong>
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={loading} color="error">
          {loading ? <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} /> : ''}
          Yes, Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
