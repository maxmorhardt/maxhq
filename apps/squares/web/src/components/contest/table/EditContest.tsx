import { Edit, LockOutlined, PersonOutlined, VisibilityOutlined } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { stripDangerousChars } from '../../../utils/sanitize';
import { useAuth } from 'react-oidc-context';
import { selectCurrentContest } from '../../../features/contests/contestSelectors';
import { updateContest } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';
import { getStatusOption } from '../../../utils/contestStatus';

interface EditContestProps {
  open: boolean;
  onClose: () => void;
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ color: 'text.disabled', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Typography variant="body2" sx={{ color: 'text.disabled', minWidth: 72, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function EditContest({ open, onClose }: EditContestProps) {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const contest = useAppSelector(selectCurrentContest);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [loading, setLoading] = useState(false);

  const isOwner = auth.user?.profile?.preferred_username === contest?.owner;
  const currentStatus = getStatusOption(contest?.status || 'ACTIVE');

  const contestStatus = contest?.status;
  const isCanceled = contestStatus === 'DELETED';
  const isFinished = contestStatus === 'FINISHED';
  const isInGame = contestStatus && ['Q1', 'Q2', 'Q3', 'Q4'].includes(contestStatus);
  const isDisabled = isCanceled || isFinished;

  const createdDate = contest?.createdAt
    ? new Date(contest.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  useEffect(() => {
    if (contest && open) {
      setHomeTeam(contest.homeTeam || '');
      setAwayTeam(contest.awayTeam || '');
    }
  }, [contest, open]);

  const handleSave = async () => {
    if (!isOwner || !contest?.id) return;
    setLoading(true);
    try {
      await dispatch(
        updateContest({
          id: contest.id,
          updates: {
            homeTeam: homeTeam.trim() || undefined,
            awayTeam: awayTeam.trim() || undefined,
          },
        })
      ).unwrap();
      showToast('Contest updated successfully', 'success');
      onClose();
    } catch (error) {
      console.error('Failed to update contest:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (contest) {
      setHomeTeam(contest.homeTeam || '');
      setAwayTeam(contest.awayTeam || '');
    }
    onClose();
  };

  if (!contest) return null;

  const titleText = isOwner ? 'Edit Contest' : 'Contest Details';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableRestoreFocus
      slotProps={{ backdrop: { onClick: handleClose } }}
    >
      <DialogTitle component="div" sx={{ pb: 1.5, pr: 7 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Edit fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.1rem', flexGrow: 1 }}>
            {titleText}
          </Typography>
          <Chip
            label={currentStatus.label}
            size="small"
            sx={{
              background: currentStatus.color,
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
        </Stack>
        <IconButton
          ref={closeButtonRef}
          onClick={handleClose}
          size="small"
          aria-label="Close dialog"
          sx={{ position: 'absolute', right: 10, top: 10, color: 'text.secondary' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={2.5}>
          {/* Contest meta info */}
          <Box
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              px: 2,
              py: 1.5,
            }}
          >
            <Stack spacing={1}>
              <DetailRow icon={<Edit sx={{ fontSize: 16 }} />} label="Name" value={contest.name} />
              <DetailRow
                icon={<PersonOutlined sx={{ fontSize: 16 }} />}
                label="Owner"
                value={contest.owner}
              />
              <DetailRow
                icon={<VisibilityOutlined sx={{ fontSize: 16 }} />}
                label="Visibility"
                value={contest.visibility === 'public' ? 'Public' : 'Private'}
              />
              <DetailRow
                icon={<LockOutlined sx={{ fontSize: 16 }} />}
                label="Created"
                value={createdDate}
              />
            </Stack>
          </Box>

          {isOwner && (
            <>
              <Divider />

              {(isCanceled || isFinished) && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  This contest is {isCanceled ? 'deleted' : 'finished'} and cannot be edited.
                </Typography>
              )}

              {isInGame && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Game is in progress — team names can still be updated.
                </Typography>
              )}

              <Stack direction="row" spacing={2}>
                <Tooltip
                  title={isDisabled ? 'Cannot edit a finished or deleted contest' : ''}
                  placement="top"
                >
                  <span style={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="Home Team"
                      value={homeTeam}
                      onChange={(e) => setHomeTeam(stripDangerousChars(e.target.value))}
                      placeholder="Enter home team"
                      disabled={isDisabled}
                      slotProps={{ htmlInput: { maxLength: 20 } }}
                    />
                  </span>
                </Tooltip>
                <Tooltip
                  title={isDisabled ? 'Cannot edit a finished or deleted contest' : ''}
                  placement="top"
                >
                  <span style={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="Away Team"
                      value={awayTeam}
                      onChange={(e) => setAwayTeam(stripDangerousChars(e.target.value))}
                      placeholder="Enter away team"
                      disabled={isDisabled}
                      slotProps={{ htmlInput: { maxLength: 20 } }}
                    />
                  </span>
                </Tooltip>
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={handleClose} color="inherit">
          {isOwner ? 'Cancel' : 'Close'}
        </Button>
        {isOwner && (
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading || isDisabled}
            sx={{ minWidth: 120 }}
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
