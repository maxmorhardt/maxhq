import { Edit } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { selectCurrentContest } from '../../features/contests/contestSelectors';
import { updateContest } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useToast } from '../../hooks/useToast';
import { getStatusOption } from '../../utils/contestStatus';

interface EditContestProps {
  open: boolean;
  onClose: () => void;
}

export default function EditContest({ open, onClose }: EditContestProps) {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const contest = useAppSelector(selectCurrentContest);

  // form state for editable fields
  const [contestName, setContestName] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [loading, setLoading] = useState(false);

  // check if current user owns the contest
  const isOwner = auth.user?.profile?.preferred_username === contest?.owner;
  const currentStatus = getStatusOption(contest?.status || 'ACTIVE');

  // calculate status flags
  const contestStatus = contest?.status;
  const totalSquares = contest?.squares?.length || 0;
  const filledSquares =
    contest?.squares?.filter((s) => s.value && s.value.trim() !== '').length || 0;
  const isCanceled = contestStatus === 'DELETED';
  const isFinished = contestStatus === 'FINISHED';
  const isInGame = contestStatus && ['Q1', 'Q2', 'Q3', 'Q4'].includes(contestStatus);
  const isDisabled = isCanceled || isFinished;

  const getStatusDisplay = () => {
    if (isCanceled) {
      return 'Deleted';
    }

    if (isFinished) {
      return 'Finished';
    }

    if (isInGame) {
      return `In Progress • ${contestStatus}`;
    }

    return `Active • ${filledSquares}/${totalSquares} Squares Filled`;
  };

  // initialize form with contest data when modal opens
  useEffect(() => {
    if (contest && open) {
      setContestName(contest.name || '');
      setHomeTeam(contest.homeTeam || '');
      setAwayTeam(contest.awayTeam || '');
    }
  }, [contest, open]);

  // validate and dispatch update action
  const handleSave = async () => {
    if (!isOwner || !contest?.id) return;

    // Validate contest name
    if (!contestName.trim()) {
      showToast('Contest name is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        name: contestName.trim(),
        homeTeam: homeTeam.trim() || undefined,
        awayTeam: awayTeam.trim() || undefined,
      };

      await dispatch(updateContest({ id: contest.id, updates })).unwrap();
      showToast('Contest updated successfully', 'success');
      onClose();
    } catch (error) {
      console.error('Failed to update contest:', error);
    } finally {
      setLoading(false);
    }
  };

  // reset form to original values on close
  const handleClose = () => {
    // Reset form to current values
    if (contest) {
      setContestName(contest.name || '');
      setHomeTeam(contest.homeTeam || '');
      setAwayTeam(contest.awayTeam || '');
    }
    onClose();
  };

  if (!contest) {
    return null;
  }

  // show read-only message if user is not the owner
  if (!isOwner) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Contest Details</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Only the contest owner can edit contest settings.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      {/* dialog title with edit icon and close button */}
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 2, pr: 6 }}>
        <Edit />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Edit Contest
        </Typography>
        <IconButton
          onClick={handleClose}
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

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* current status display card */}
          <Card sx={{ borderRadius: 2 }}>
            <CardContent sx={{ '&:last-child': { pb: 2 } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                  Contest Status
                </Typography>
                <Chip
                  label={currentStatus?.label}
                  size="small"
                  sx={{
                    background: currentStatus.color,
                    color: 'white',
                    fontSize: '0.8rem',
                  }}
                />
              </Box>
              <Typography variant="body1" sx={{ color: 'white', opacity: 0.9 }}>
                {getStatusDisplay()}
              </Typography>
            </CardContent>
          </Card>

          {/* contest name input */}
          <TextField
            fullWidth
            label="Contest Name"
            value={contestName}
            onChange={(e) => setContestName(e.target.value)}
            placeholder="Enter contest name"
            required
            disabled={isDisabled}
            slotProps={{ htmlInput: { maxLength: 20 } }}
          />

          {/* team name inputs */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Home Team"
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              placeholder="Enter home team name"
              disabled={isDisabled}
              slotProps={{ htmlInput: { maxLength: 20 } }}
            />
            <TextField
              fullWidth
              label="Away Team"
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              placeholder="Enter away team name"
              disabled={isDisabled}
              slotProps={{ htmlInput: { maxLength: 20 } }}
            />
          </Box>
        </Box>
      </DialogContent>

      {/* save button */}
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || isDisabled}
          sx={{
            minWidth: 100,
          }}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
