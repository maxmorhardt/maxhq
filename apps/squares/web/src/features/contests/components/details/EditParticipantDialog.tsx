import { Close, ErrorOutlineOutlined } from '@mui/icons-material';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type {
  Participant,
  ParticipantRole,
  UpdateParticipantRequest,
} from '../../../../types/contest';
import { errorMessage } from '../../../../api/errors';
import { participantName } from '../../../../utils/publicName';
import { useToast } from '../../../toast/useToast';
import { useUpdateParticipantMutation } from '../../api';

interface Props {
  contestId: string;
  participant: Participant | null;
  onClose: () => void;
}

// owners keep their role and may hold zero squares; viewers hold none; participants at least one
function buildRequest(
  participant: Participant,
  role: ParticipantRole,
  maxSquares: number
): UpdateParticipantRequest {
  if (participant.role === 'owner') {
    return { maxSquares };
  }
  return role === 'viewer' ? { role, maxSquares: 0 } : { role, maxSquares };
}

export default function EditParticipantDialog({ contestId, participant, onClose }: Props) {
  // remounting per participant resets the form to their current values
  return participant ? (
    <EditParticipantForm
      key={participant.id}
      contestId={contestId}
      participant={participant}
      onClose={onClose}
    />
  ) : null;
}

function EditParticipantForm({
  contestId,
  participant,
  onClose,
}: Props & { participant: Participant }) {
  const { showToast } = useToast();
  const [updateParticipant, { isLoading, isError, error }] = useUpdateParticipantMutation();
  const [role, setRole] = useState<ParticipantRole>(participant.role);
  const [maxSquares, setMaxSquares] = useState(participant.maxSquares);

  const isOwner = participant.role === 'owner';

  const handleSave = async () => {
    try {
      await updateParticipant({
        contestId,
        userId: participant.userId,
        request: buildRequest(participant, role, maxSquares),
      }).unwrap();
      showToast('Participant updated', 'success');
      onClose();
    } catch {
      // the save button turns into a retry
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Edit Participant
        <IconButton
          aria-label="Close dialog"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>{participantName(participant)}</Typography>
        <Typography
          variant="body2"
          sx={{ mb: 2, color: 'rgba(255,255,255,0.7)', overflowWrap: 'anywhere' }}
        >
          {participant.userId}
        </Typography>

        {!isOwner && (
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={role}
              label="Role"
              onChange={(e) => {
                const next = e.target.value as ParticipantRole;
                setRole(next);
                // participants need at least one square
                if (next === 'participant' && maxSquares < 1) {
                  setMaxSquares(1);
                }
              }}
            >
              <MenuItem value="participant">Participant</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </FormControl>
        )}

        {role !== 'viewer' && (
          <>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.5 }}>
              Max Squares: {maxSquares}
            </Typography>
            <Slider
              value={maxSquares}
              onChange={(_, value) => setMaxSquares(value)}
              min={isOwner ? 0 : 1}
              max={100}
              valueLabelDisplay="auto"
              size="small"
            />
          </>
        )}

        {isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage(error, 'Failed to update participant')}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color={isError ? 'error' : 'primary'}
          onClick={handleSave}
          disabled={isLoading}
          startIcon={isError ? <ErrorOutlineOutlined /> : undefined}
        >
          {isError ? 'Failed, Retry' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
