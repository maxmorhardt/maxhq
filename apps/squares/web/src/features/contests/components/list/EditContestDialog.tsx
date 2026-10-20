import {
  Close,
  Edit,
  LockOutlined,
  PersonOutlined,
  Public,
  SportsFootball,
  VisibilityOutlined,
} from '@mui/icons-material';
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { errorMessage } from '../../../../api/errors';
import type { ContestSummary, ContestVisibility } from '../../../../types/contest';
import { getStatusOption, isTerminalStatus } from '../../../../utils/contestStatus';
import { useToast } from '../../../toast/useToast';
import { useUpdateContestMutation } from '../../api';

interface Props {
  contest: ContestSummary | null;
  onClose: () => void;
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
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

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export default function EditContestDialog({ contest, onClose }: Props) {
  // remounting per contest resets the form to its current values
  return contest ? <EditContestForm key={contest.id} contest={contest} onClose={onClose} /> : null;
}

function EditContestForm({ contest, onClose }: { contest: ContestSummary; onClose: () => void }) {
  const auth = useAuth();
  const { showToast } = useToast();
  const [updateContest, { isLoading }] = useUpdateContestMutation();

  const [visibility, setVisibility] = useState<ContestVisibility>(contest.visibility);

  const status = getStatusOption(contest.status);
  const canEdit = auth.user?.profile?.email === contest.owner && !isTerminalStatus(contest.status);

  const handleSave = async () => {
    try {
      await updateContest({
        id: contest.id,
        updates: { visibility },
        version: contest.version,
      }).unwrap();
      showToast('Contest updated successfully', 'success');
      onClose();
    } catch (err) {
      showToast(errorMessage(err, 'Error updating contest'), 'error');
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle component="div" sx={{ pb: 1.5, pr: 7 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {canEdit ? (
            <Edit fontSize="small" sx={{ color: 'text.secondary' }} />
          ) : (
            <VisibilityOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
          )}
          <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.1rem', flexGrow: 1 }}>
            {canEdit ? 'Edit Contest' : 'View Contest'}
          </Typography>
          <Chip
            label={status.label}
            size="small"
            sx={{
              background: status.color,
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
        </Stack>
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Close dialog"
          sx={{ position: 'absolute', right: 10, top: 10, color: 'text.secondary' }}
        >
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={2.5}>
          <Box
            sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', px: 2, py: 1.5 }}
          >
            <Stack spacing={1}>
              <DetailRow icon={<Edit sx={{ fontSize: 16 }} />} label="Name" value={contest.name} />
              <DetailRow
                icon={<SportsFootball sx={{ fontSize: 16 }} />}
                label="Game"
                value={`${contest.awayTeam ?? 'Away'} @ ${contest.homeTeam ?? 'Home'}`}
              />
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
                value={contest.createdAt ? formatDate(contest.createdAt) : '–'}
              />
            </Stack>
          </Box>

          {canEdit && (
            <>
              <Divider />

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
                  onChange={(_, value: ContestVisibility | null) => value && setVisibility(value)}
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
            disabled={isLoading}
            sx={{ minWidth: 120 }}
          >
            {isLoading ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
