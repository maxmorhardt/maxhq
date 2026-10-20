import { SportsScore } from '@mui/icons-material';
import { Button, Divider, Typography } from '@mui/material';
import { errorMessage } from '../../../../api/errors';
import { useToast } from '../../../toast/useToast';
import { useStartContestMutation } from '../../api';

interface Props {
  contestId: string;
}

export default function StartGameButton({ contestId }: Props) {
  const { showToast } = useToast();
  const [startContest, { isLoading }] = useStartContestMutation();

  const handleStart = async () => {
    try {
      await startContest(contestId).unwrap();
      showToast('Quarter 1 started!', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Error starting contest'), 'error');
    }
  };

  return (
    <>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Button
        variant="contained"
        startIcon={<SportsScore />}
        onClick={handleStart}
        disabled={isLoading}
        fullWidth
      >
        {isLoading ? 'Starting...' : 'Start Quarter 1'}
      </Button>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
        Start the game and begin Quarter 1.
      </Typography>
    </>
  );
}
