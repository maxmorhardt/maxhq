import { SportsScore } from '@mui/icons-material';
import { Box, Button, Divider, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { errorMessage } from '../../../../api/errors';
import { blockNonIntegerKeys, noNumberSpinners } from '../../../../components/inputs';
import type { Contest } from '../../../../types/contest';
import { useToast } from '../../../toast/useToast';
import { useRecordQuarterResultMutation } from '../../api';

const MAX_SCORE_LENGTH = 4;

interface Props {
  contest: Contest;
}

// manual scoring for contests that are not linked to a live game
export default function ScoreUpdateControls({ contest }: Props) {
  const { showToast } = useToast();
  const [recordQuarterResult, { isLoading }] = useRecordQuarterResultMutation();
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const handleSubmit = async () => {
    const home = parseInt(homeScore, 10);
    const away = parseInt(awayScore, 10);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      return;
    }

    try {
      await recordQuarterResult({
        contestId: contest.id,
        request: { homeTeamScore: home, awayTeamScore: away },
      }).unwrap();
      showToast('Quarter score recorded successfully', 'success');
      setHomeScore('');
      setAwayScore('');
    } catch (err) {
      showToast(errorMessage(err, 'Error recording quarter result'), 'error');
    }
  };

  const scoreField = (label: string, value: string, onChange: (value: string) => void) => (
    <TextField
      label={label}
      type="number"
      value={value}
      onKeyDown={blockNonIntegerKeys}
      onChange={(e) => {
        if (e.target.value.length <= MAX_SCORE_LENGTH) {
          onChange(e.target.value);
        }
      }}
      size="small"
      sx={{ flex: 1, ...noNumberSpinners }}
    />
  );

  return (
    <>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <SportsScore sx={{ color: '#3ddc84', fontSize: '1rem' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
          Update Score
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        {scoreField(contest.homeTeam || 'Home', homeScore, setHomeScore)}
        {scoreField(contest.awayTeam || 'Away', awayScore, setAwayScore)}
      </Box>

      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={!homeScore || !awayScore || isLoading}
        fullWidth
        size="small"
      >
        Update Score
      </Button>
    </>
  );
}
