import { Divider, Typography } from '@mui/material';

interface ActiveContestControlsProps {
  allSquaresFilled: boolean;
}

export default function ActiveContestControls({ allSquaresFilled }: ActiveContestControlsProps) {
  if (allSquaresFilled) return null;

  return (
    <>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
        Waiting for all squares to be filled before you can start the game.
      </Typography>
    </>
  );
}
