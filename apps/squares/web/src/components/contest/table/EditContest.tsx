import {
  Edit,
  LockOutlined,
  PersonOutlined,
  Public,
  VisibilityOutlined,
} from '@mui/icons-material';
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { ContestVisibility } from '../../../types/contest';
import { stripDangerousChars } from '../../../utils/sanitize';
import { useAuth } from 'react-oidc-context';
import { selectCurrentContest } from '../../../features/contests/contestSelectors';
import { updateContest } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';
import { getStatusOption, isInGameStatus, isTerminalStatus } from '../../../utils/contestStatus';

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
      <Typography
        variant="body2"
        noWrap
        title={value}
        sx={{ color: 'text.primary', fontWeight: 500, minWidth: 0 }}
      >
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
  const [visibility, setVisibility] = useState<ContestVisibility>('private');
  const [loading, setLoading] = useState(false);

  const isOwner = auth.user?.profile?.email === contest?.owner;
  const currentStatus = getStatusOption(contest?.status || 'ACTIVE');

  const contestStatus = contest?.status;
  const isInGame = isInGameStatus(contestStatus);
  const isTerminal = isTerminalStatus(contestStatus);
  const canEdit = isOwner && !isTerminal;

  const createdDate = contest?.createdAt
    ? new Date(contest.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '–';

  useEffect(() => {
    if (contest && open) {
      setHomeTeam(contest.homeTeam || '');
      setAwayTeam(contest.awayTeam || '');
      setVisibility(contest.visibility);
    }
  }, [contest, open]);

  const handleSave = async () => {
    if (!canEdit || !contest?.id) return;
    setLoading(true);
    try {
      await dispatch(
        updateContest({
          id: contest.id,
          updates: {
            homeTeam: homeTeam.trim() || undefined,
            awayTeam: awayTeam.trim() || undefined,
            visibility,
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
      setVisibility(contest.visibility);
    }
    onClose();
  };

  if (!contest) {
    return null;
  }

  const titleText = canEdit ? 'Edit Contest' : 'View Contest';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle component="div" sx={{ pb: 1.5, pr: 7 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {canEdit ? (
            <Edit fontSize="small" sx={{ color: 'text.secondary' }} />
          ) : (
            <VisibilityOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
          )}
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
              {!canEdit && (
                <DetailRow
                  icon={<VisibilityOutlined sx={{ fontSize: 16 }} />}
                  label="Visibility"
                  value={contest.visibility === 'public' ? 'Public' : 'Private'}
                />
              )}
              <DetailRow
                icon={<LockOutlined sx={{ fontSize: 16 }} />}
                label="Created"
                value={createdDate}
              />
            </Stack>
          </Box>

          {canEdit && (
            <>
              <Divider />

              {contest.gameId ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Team names come from the linked game and can&apos;t be edited.
                </Typography>
              ) : (
                isInGame && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Game is in progress. Team names can still be updated.
                  </Typography>
                )
              )}

              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Home Team"
                  value={homeTeam}
                  disabled={!!contest.gameId}
                  onChange={(e) => setHomeTeam(stripDangerousChars(e.target.value))}
                  placeholder="Enter home team"
                  slotProps={{ htmlInput: { maxLength: 20 } }}
                />
                <TextField
                  fullWidth
                  label="Away Team"
                  value={awayTeam}
                  disabled={!!contest.gameId}
                  onChange={(e) => setAwayTeam(stripDangerousChars(e.target.value))}
                  placeholder="Enter away team"
                  slotProps={{ htmlInput: { maxLength: 20 } }}
                />
              </Stack>

              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <VisibilityOutlined sx={{ fontSize: 16 }} />
                  Visibility
                </Typography>
                <ToggleButtonGroup
                  value={visibility}
                  exclusive
                  onChange={(_, val) => {
                    if (val) setVisibility(val as ContestVisibility);
                  }}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="private">
                    <LockOutlined sx={{ mr: 0.75, fontSize: '1rem' }} />
                    Private
                  </ToggleButton>
                  <ToggleButton value="public">
                    <Public sx={{ mr: 0.75, fontSize: '1rem' }} />
                    Public
                  </ToggleButton>
                </ToggleButtonGroup>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.disabled', mt: 0.75, display: 'block' }}
                >
                  {visibility === 'private'
                    ? 'Invite-only. Non-participants viewing the public board will be disconnected.'
                    : 'Anyone with the link can view. Only invited participants can claim squares.'}
                </Typography>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>

      {canEdit && (
        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
