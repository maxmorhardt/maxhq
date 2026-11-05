import { Close, ErrorOutlineOutlined } from '@mui/icons-material';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { errorMessage } from '../../../../api/errors';
import type { Participant } from '../../../../types/contest';
import { useToast } from '../../../toast/useToast';
import { useUpdateParticipantMutation } from '../../api';

interface Props {
  contestId: string;
  participant: Participant | null;
  claimed: number;
  maxAllowed: number;
  onClose: () => void;
}

export default function EditParticipantDialog({ participant, ...props }: Props) {
  // remounting per participant resets the form to their current values
  return participant ? (
    <EditParticipantForm key={participant.id} participant={participant} {...props} />
  ) : null;
}

function EditParticipantForm({
  contestId,
  participant,
  claimed,
  maxAllowed,
  onClose,
}: Omit<Props, 'participant'> & { participant: Participant }) {
  const { showToast } = useToast();
  const [updateParticipant, { isLoading, isError, error }] = useUpdateParticipantMutation();
  const [maxSquares, setMaxSquares] = useState(participant.maxSquares);

  const freed = Math.max(0, claimed - maxSquares);
  const left = maxAllowed - maxSquares;

  const handleSave = async () => {
    try {
      await updateParticipant({ contestId, userId: participant.userId, maxSquares }).unwrap();
      showToast('Participant updated', 'success');
      onClose();
    } catch {
      // the save button turns into a retry
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Edit Squares
        <IconButton
          aria-label="Close dialog"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography sx={{ mb: 2, fontWeight: 600 }}>{participant.displayName}</Typography>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Max Squares: {maxSquares}
        </Typography>
        <Slider
          value={maxSquares}
          onChange={(_, value) => setMaxSquares(value)}
          min={0}
          max={maxAllowed}
          valueLabelDisplay="auto"
          size="small"
          slotProps={{ input: { 'aria-label': 'Max squares' } }}
        />
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          {left === 1 ? '1 square' : `${left} squares`} left to give out
        </Typography>

        {freed > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {freed === 1 ? '1 of their squares' : `${freed} of their squares`} will be freed at
            random. They hold {claimed} right now.
          </Alert>
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
          color={isError ? 'error' : freed > 0 ? 'warning' : 'primary'}
          onClick={handleSave}
          disabled={isLoading || maxSquares === participant.maxSquares}
          startIcon={isError ? <ErrorOutlineOutlined /> : undefined}
        >
          {isError ? 'Failed, Retry' : freed > 0 ? `Save and Free ${freed}` : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
