import { Add, Casino, GridOff, Remove } from '@mui/icons-material';
import { Box, Button, IconButton, TextField } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage, errorStatus } from '../../../../api/errors';
import { blockNonIntegerKeys, noNumberSpinners } from '../../../../components/inputs';
import type { Contest } from '../../../../types/contest';
import { useGetMyProfileQuery } from '../../../profile/api';
import { useToast } from '../../../toast/useToast';
import { useClaimRandomSquaresMutation, useClearMySquaresMutation } from '../../api';
import type { ContestViewer } from '../../live/viewer';

interface Props {
  contest: Contest;
  viewer: ContestViewer;
  emptySquares: number;
}

// the fill-phase actions a participant has: claim random squares, or give back their own
export default function SquareActions({ contest, viewer, emptySquares }: Props) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: profile } = useGetMyProfileQuery();
  const [claimRandom, { isLoading: claiming }] = useClaimRandomSquaresMutation();
  const [clearMine, { isLoading: clearing }] = useClearMySquaresMutation();
  const [requested, setRequested] = useState(1);

  const maxFill = Math.min(viewer.squaresLeft, emptySquares);
  const count = Math.min(Math.max(requested, 1), Math.max(maxFill, 1));
  const busy = claiming || clearing;
  const randomDisabled = busy || maxFill === 0;

  const handleClaimRandom = async () => {
    // claims use the profile's default initials, so they have to exist first
    if (!profile?.defaultInitials) {
      showToast('Set your initials in your profile before claiming a square', 'warning');
      navigate('/profile');
      return;
    }

    try {
      const result = await claimRandom({ contestId: contest.id, count }).unwrap();
      if (result.squares.length < count) {
        showToast(`Claimed ${result.squares.length} of ${count} squares`, 'warning');
      }
    } catch (err) {
      showToast(
        errorMessage(err, 'Could not claim squares'),
        errorStatus(err) === 409 ? 'warning' : 'error'
      );
    }
  };

  const handleClearMine = async () => {
    try {
      await clearMine(contest.id).unwrap();
    } catch (err) {
      showToast(errorMessage(err, 'Error clearing squares'), 'error');
    }
  };

  const randomLabel = claiming
    ? 'Selecting...'
    : viewer.squaresLeft === 0
      ? 'No Squares Left'
      : emptySquares === 0
        ? 'Grid Is Full'
        : count > 1
          ? `Randomly Select ${count}`
          : 'Randomly Select Square';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {/* the stepper only earns its space when more than one square can be claimed */}
        {maxFill > 1 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              aria-label="decrease square count"
              size="small"
              onClick={() => setRequested(count - 1)}
              disabled={randomDisabled || count <= 1}
              sx={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <Remove sx={{ fontSize: '1.15rem' }} />
            </IconButton>

            <TextField
              type="number"
              value={count}
              onKeyDown={blockNonIntegerKeys}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                setRequested(isNaN(parsed) ? 1 : Math.min(parsed, maxFill));
              }}
              disabled={randomDisabled}
              size="small"
              slotProps={{ htmlInput: { 'aria-label': 'number of squares to fill' } }}
              sx={{
                flex: 1,
                '& input': { textAlign: 'center', py: 0.75, fontSize: '0.9rem' },
                ...noNumberSpinners,
              }}
            />

            <IconButton
              aria-label="increase square count"
              size="small"
              onClick={() => setRequested(count + 1)}
              disabled={randomDisabled || count >= maxFill}
              sx={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <Add sx={{ fontSize: '1.15rem' }} />
            </IconButton>

            <Button
              size="small"
              onClick={() => setRequested(maxFill)}
              disabled={randomDisabled || count >= maxFill}
              sx={{ minWidth: 'auto', px: 1, fontSize: '0.8rem' }}
            >
              Max
            </Button>
          </Box>
        )}

        <Button
          variant="outlined"
          startIcon={<Casino />}
          onClick={handleClaimRandom}
          disabled={randomDisabled}
          size="small"
          fullWidth
        >
          {randomLabel}
        </Button>
      </Box>

      {viewer.squaresClaimed > 0 && (
        <Button
          variant="outlined"
          color="warning"
          startIcon={<GridOff />}
          onClick={handleClearMine}
          disabled={busy}
          size="small"
          fullWidth
        >
          {clearing ? 'Clearing...' : 'Clear My Squares'}
        </Button>
      )}
    </Box>
  );
}
