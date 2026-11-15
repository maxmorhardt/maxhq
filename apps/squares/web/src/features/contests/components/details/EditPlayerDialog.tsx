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
import type { Player } from '../../../../types/contest';
import { plural } from '../../../../utils/plural';
import { useToast } from '../../../toast/useToast';
import { useUpdatePlayerMutation } from '../../api';

interface Props {
  contestId: string;
  player: Player | null;
  claimed: number;
  maxAllowed: number;
  onClose: () => void;
}

export default function EditPlayerDialog({ player, ...props }: Props) {
  // remounting per player resets the form to their current values
  return player ? <EditPlayerForm key={player.id} player={player} {...props} /> : null;
}

function EditPlayerForm({
  contestId,
  player,
  claimed,
  maxAllowed,
  onClose,
}: Omit<Props, 'player'> & { player: Player }) {
  const { showToast } = useToast();
  const [updatePlayer, { isLoading, isError, error }] = useUpdatePlayerMutation();
  const [maxSquares, setMaxSquares] = useState(player.maxSquares);

  const freed = Math.max(0, claimed - maxSquares);
  const left = maxAllowed - maxSquares;

  const handleSave = async () => {
    try {
      await updatePlayer({ contestId, userId: player.userId, maxSquares }).unwrap();
      showToast(
        freed > 0
          ? `${player.displayName} now has ${plural(maxSquares, 'square')}, ${freed} freed`
          : `${player.displayName} now has ${plural(maxSquares, 'square')}`,
        'success'
      );
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
        <Typography sx={{ mb: 2, fontWeight: 600 }}>{player.displayName}</Typography>

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
            {errorMessage(error, 'Failed to update player')}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color={isError ? 'error' : freed > 0 ? 'warning' : 'primary'}
          onClick={handleSave}
          disabled={isLoading || maxSquares === player.maxSquares}
          startIcon={isError ? <ErrorOutlineOutlined /> : undefined}
        >
          {isError ? 'Failed, Retry' : freed > 0 ? `Save and Free ${freed}` : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
