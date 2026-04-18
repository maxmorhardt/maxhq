import { Casino } from '@mui/icons-material';
import { Button, Divider, Typography } from '@mui/material';

interface ActiveContestControlsProps {
  allSquaresFilled: boolean;
  hasEmptySquares: boolean;
  onRandomSquare?: () => void;
}

export default function ActiveContestControls({
  allSquaresFilled,
  hasEmptySquares,
  onRandomSquare,
}: ActiveContestControlsProps) {
  if (allSquaresFilled) return null;

  return (
    <>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
        Waiting for all squares to be filled before you can start the game.
      </Typography>

      {hasEmptySquares && (
        <Button
          variant="outlined"
          startIcon={<Casino />}
          onClick={onRandomSquare}
          size="small"
          fullWidth
        >
          Randomly Select Square
        </Button>
      )}
    </>
  );
}
