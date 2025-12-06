import { Cancel, CheckCircle, Edit, EmojiEvents, Lock, Shuffle } from '@mui/icons-material';
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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { selectCurrentContest } from '../../features/contests/contestSelectors';
import { updateContest } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useToast } from '../../hooks/useToast';
import type { Contest, ContestStatus } from '../../types/contest';
import { gradients } from '../../types/gradients';
import { statusOptions, getStatusOption } from '../../utils/contestStatus';

interface EditContestProps {
  open: boolean;
  onClose: () => void;
}

export default function EditContest({ open, onClose }: EditContestProps) {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const contest = useAppSelector(selectCurrentContest);

  const [contestName, setContestName] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [status, setStatus] = useState<ContestStatus>('ACTIVE');
  const [loading, setLoading] = useState(false);

  const isOwner = auth.user?.profile?.preferred_username === contest?.owner;
  const currentStatus = statusOptions.find((s) => s.value === (contest?.status || 'ACTIVE'));

  // Initialize form values when contest or modal opens
  useEffect(() => {
    if (contest && open) {
      setContestName(contest.name || '');
      setHomeTeam(contest.homeTeam || '');
      setAwayTeam(contest.awayTeam || '');
      setStatus(contest.status || 'ACTIVE');
    }
  }, [contest, open]);

  const handleSave = async () => {
    if (!isOwner || !contest?.id) return;

    // Validate contest name
    if (!contestName.trim()) {
      showToast('Contest name is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const updates: Partial<Contest> = {
        name: contestName.trim() || undefined,
        homeTeam: homeTeam.trim() || undefined,
        awayTeam: awayTeam.trim() || undefined,
        status,
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

  const handleClose = () => {
    // Reset form to current values
    if (contest) {
      setContestName(contest.name || '');
      setHomeTeam(contest.homeTeam || '');
      setAwayTeam(contest.awayTeam || '');
      setStatus(contest.status || 'ACTIVE');
    }
    onClose();
  };

  const getStatusActions = () => {
    switch (status) {
      case 'ACTIVE':
        return 'Players can join and modify squares';
      case 'LOCKED':
        return 'Board locked, labels will be randomized automatically';
      case 'Q1':
      case 'Q2':
      case 'Q3':
      case 'Q4':
        return 'Quarter in progress, winners can be selected';
      case 'FINISHED':
        return 'Contest complete, all winners determined';
      case 'CANCELLED':
        return 'Contest cancelled, no winners';
      default:
        return '';
    }
  };

  if (!contest) {
    return null;
  }

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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Edit />
        Edit Contest
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Current Status Display */}
          <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Typography variant="h6">Current Status</Typography>
                <Chip
                  label={currentStatus?.label}
                  sx={{
                    background: getStatusOption(contest?.status).color,
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {currentStatus?.description}
              </Typography>
            </CardContent>
          </Card>

          {/* Contest Name */}
          <TextField
            fullWidth
            label="Contest Name"
            value={contestName}
            onChange={(e) => setContestName(e.target.value)}
            placeholder="Enter contest name"
            required
          />

          {/* Team Names */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Home Team"
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              placeholder="Enter home team name"
            />
            <TextField
              fullWidth
              label="Away Team"
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              placeholder="Enter away team name"
            />
          </Box>

          {/* Status Selection */}
          <FormControl fullWidth>
            <InputLabel>Contest Status</InputLabel>
            <Select
              value={status}
              label="Contest Status"
              onChange={(e) => setStatus(e.target.value as ContestStatus)}
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: option.color,
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1">{option.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status Action Info */}
          <Card variant="outlined" sx={{ bgcolor: 'rgba(25, 118, 210, 0.04)' }}>
            <CardContent>
              <Typography
                variant="subtitle2"
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
              >
                <CheckCircle fontSize="small" />
                What happens when you save:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getStatusActions()}
              </Typography>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<Lock />}
                onClick={() => setStatus('LOCKED')}
                disabled={status === 'LOCKED'}
              >
                Lock Board
              </Button>
              <Button variant="outlined" startIcon={<Shuffle />} disabled={status === 'ACTIVE'}>
                Randomize Labels
              </Button>
              <Button
                variant="outlined"
                startIcon={<EmojiEvents />}
                disabled={!['Q1', 'Q2', 'Q3', 'Q4'].includes(status)}
              >
                Pick Winners
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                color="error"
                onClick={() => setStatus('CANCELLED')}
              >
                Cancel Contest
              </Button>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          sx={{
            background: gradients.primary,
            minWidth: 100,
          }}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
