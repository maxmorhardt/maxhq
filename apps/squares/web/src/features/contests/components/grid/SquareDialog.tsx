import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { errorMessage } from '../../../../api/errors';
import type { Contest, Square } from '../../../../types/contest';
import { useToast } from '../../../toast/useToast';
import { useClearSquareMutation } from '../../api';
import type { ContestViewer } from '../../live/viewer';

interface Props {
  square: Square | null;
  contest: Contest;
  viewer: ContestViewer;
  onClose: () => void;
}

export default function SquareDialog({ square, contest, viewer, onClose }: Props) {
  const { showToast } = useToast();
  const [clearSquare, { isLoading: clearing }] = useClearSquareMutation();

  if (!square) {
    return null;
  }

  const isMine = !!viewer.email && square.owner === viewer.email;
  const isClaimed = square.value.trim() !== '';
  const canClear = contest.status === 'ACTIVE' && isMine && isClaimed;

  const winningQuarters = (contest.quarterResults ?? [])
    .filter((qr) => qr.winnerRow === square.row && qr.winnerCol === square.col)
    .map((qr) => qr.quarter)
    .sort((a, b) => a - b);

  const title = isMine ? 'Your Square' : isClaimed ? 'Square Details' : 'Empty Square';

  const handleClear = async () => {
    try {
      await clearSquare({ contestId: square.contestId, squareId: square.id }).unwrap();
      onClose();
    } catch (err) {
      showToast(errorMessage(err, 'Error clearing square'), 'error');
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 20, fontWeight: 700, pr: 6 }}>
        {title}
        <IconButton
          aria-label="Close dialog"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {isClaimed ? (
            <>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Initials:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {square.value}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}
              >
                {isMine ? 'Claimed by you' : `Claimed by ${square.ownerName || square.owner}`}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              This square is unclaimed.
            </Typography>
          )}

          {winningQuarters.length > 0 && (
            <Box
              sx={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.75,
                borderRadius: 999,
                background: 'rgba(67, 233, 123, 0.12)',
                border: '1px solid rgba(67, 233, 123, 0.4)',
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: 18, color: 'rgba(67, 233, 123, 0.9)' }} />
              <Typography
                variant="body2"
                sx={{ color: 'rgba(67, 233, 123, 0.9)', fontWeight: 700 }}
              >
                Winner · {winningQuarters.map((q) => `Q${q}`).join(', ')}
              </Typography>
            </Box>
          )}

          {isMine && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Your initials come from your profile.{' '}
              <Link component={RouterLink} to="/profile" onClick={onClose}>
                Change your default initials
              </Link>
            </Typography>
          )}
        </Box>
      </DialogContent>

      {canClear && (
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={handleClear}
            variant="outlined"
            color="warning"
            disabled={clearing}
            sx={{ minHeight: 37, minWidth: 120 }}
          >
            {clearing ? <CircularProgress size={16} color="inherit" /> : 'Clear Square'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
