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
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useAuth } from 'react-oidc-context';
import { Link as RouterLink } from 'react-router-dom';
import {
  selectCurrentContest,
  selectCurrentSquare,
  selectSquareLoading,
} from '../../../features/contests/contestSelectors';

import { clearSquare } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';

interface EditSquareProps {
  open: boolean;
  onClose: () => void;
}

export default function EditSquare({ open, onClose }: EditSquareProps) {
  const dispatch = useAppDispatch();
  const auth = useAuth();

  const currentSquare = useAppSelector(selectCurrentSquare);
  const currentContest = useAppSelector(selectCurrentContest);
  const loading = useAppSelector(selectSquareLoading);

  if (!currentSquare) {
    return;
  }

  const isOwner = currentSquare.owner === auth?.user?.profile?.email;
  const isActive = currentContest?.status === 'ACTIVE';
  const isClaimed = Boolean(currentSquare.value && currentSquare.value.trim());

  const winningQuarters =
    currentContest?.quarterResults
      ?.filter((qr) => qr.winnerRow === currentSquare?.row && qr.winnerCol === currentSquare?.col)
      .map((qr) => qr.quarter)
      .sort((a, b) => a - b) ?? [];

  const isWinner = winningQuarters.length > 0;

  const handleClear = async () => {
    try {
      await dispatch(
        clearSquare({
          contestId: currentSquare.contestId,
          squareId: currentSquare.id,
        })
      ).unwrap();
      onClose();
    } catch (error) {
      console.error('Failed to clear square:', error);
    }
  };

  const canClear = isActive && isOwner && isClaimed;
  const title = isOwner ? 'Your Square' : isClaimed ? 'Square Details' : 'Empty Square';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {/* dialog title with close button */}
      <DialogTitle sx={{ fontSize: 20, fontWeight: 700, pr: 6 }}>
        {title}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* square details */}
          {isClaimed ? (
            <>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Initials:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {currentSquare.value}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}
              >
                {isOwner
                  ? 'Claimed by you'
                  : `Claimed by ${currentSquare.ownerName || currentSquare.owner}`}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              This square is unclaimed.
            </Typography>
          )}

          {/* winner badge if square won any quarters */}
          {isWinner && (
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

          {/* let the owner update the default initials future claims will use */}
          {isOwner && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Your initials come from your profile.{' '}
              <Link component={RouterLink} to="/profile" onClick={onClose}>
                Change your default initials
              </Link>
            </Typography>
          )}
        </Box>
      </DialogContent>

      {/* clear action, only for the owner while the contest is active */}
      {canClear && (
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={handleClear}
            variant="outlined"
            color="warning"
            disabled={loading}
            sx={{ minHeight: 37, minWidth: 120 }}
          >
            {loading ? <CircularProgress size={16} color="inherit" /> : 'Clear Square'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
