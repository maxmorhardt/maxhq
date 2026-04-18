import { SportsScore } from '@mui/icons-material';
import { Box, Button, Divider, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { selectCurrentContest } from '../../../features/contests/contestSelectors';
import { updateQuarterResult } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';

const MAX_SCORE_LENGTH = 4;

export default function ScoreUpdateControls() {
  const dispatch = useAppDispatch();
  const currentContest = useAppSelector(selectCurrentContest);
  const { showToast } = useToast();
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleScoreSubmit = async () => {
    if (!currentContest) return;

    setIsLoading(true);

    const home = parseInt(homeScore);
    const away = parseInt(awayScore);

    if (isNaN(home) || isNaN(away)) return;
    if (home < 0 || away < 0) return;

    try {
      await dispatch(
        updateQuarterResult({
          contestId: currentContest.id,
          request: {
            homeTeamScore: home,
            awayTeamScore: away,
          },
        })
      ).unwrap();

      showToast('Quarter score recorded successfully', 'success');
      setHomeScore('');
      setAwayScore('');
    } catch (error) {
      console.error('Failed to record quarter result:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentContest) return null;

  return (
    <>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <SportsScore sx={{ color: '#43e97b', fontSize: '1rem' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
          Update Score
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          label={currentContest.homeTeam || 'Home'}
          type="number"
          value={homeScore}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '-'].includes(e.key)) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= MAX_SCORE_LENGTH) {
              setHomeScore(value);
            }
          }}
          size="small"
          sx={{
            flex: 1,
            '& input[type=number]': { MozAppearance: 'textfield' },
            '& input[type=number]::-webkit-outer-spin-button': {
              WebkitAppearance: 'none',
              margin: 0,
            },
            '& input[type=number]::-webkit-inner-spin-button': {
              WebkitAppearance: 'none',
              margin: 0,
            },
          }}
        />
        <TextField
          label={currentContest.awayTeam || 'Away'}
          type="number"
          value={awayScore}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '-'].includes(e.key)) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= MAX_SCORE_LENGTH) {
              setAwayScore(value);
            }
          }}
          size="small"
          sx={{
            flex: 1,
            '& input[type=number]': { MozAppearance: 'textfield' },
            '& input[type=number]::-webkit-outer-spin-button': {
              WebkitAppearance: 'none',
              margin: 0,
            },
            '& input[type=number]::-webkit-inner-spin-button': {
              WebkitAppearance: 'none',
              margin: 0,
            },
          }}
        />
      </Box>

      <Button
        variant="contained"
        onClick={handleScoreSubmit}
        disabled={!homeScore || !awayScore || isLoading}
        fullWidth
        size="small"
      >
        Update Score
      </Button>
    </>
  );
}
