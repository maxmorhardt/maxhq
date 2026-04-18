import { SportsScore } from '@mui/icons-material';
import { Button, Divider, Typography } from '@mui/material';
import { useState } from 'react';
import { selectCurrentContest } from '../../../features/contests/contestSelectors';
import { startContestThunk } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';

export default function StartGameButton() {
  const dispatch = useAppDispatch();
  const currentContest = useAppSelector(selectCurrentContest);
  const { showToast } = useToast();
  const [isStartingQ1, setIsStartingQ1] = useState(false);

  const handleStartQ1 = async () => {
    if (!currentContest || isStartingQ1) return;

    setIsStartingQ1(true);

    try {
      await dispatch(startContestThunk(currentContest.id)).unwrap();
      showToast('Quarter 1 started!', 'success');
    } catch (error) {
      console.error('Failed to start Q1:', error);
    } finally {
      setIsStartingQ1(false);
    }
  };

  return (
    <>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Button
        variant="contained"
        startIcon={<SportsScore />}
        onClick={handleStartQ1}
        disabled={isStartingQ1}
        fullWidth
      >
        {isStartingQ1 ? 'Starting...' : 'Start Quarter 1'}
      </Button>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
        Start the game and begin Quarter 1.
      </Typography>
    </>
  );
}
