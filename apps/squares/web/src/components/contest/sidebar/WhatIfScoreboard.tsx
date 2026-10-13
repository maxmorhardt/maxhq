import { Casino, RestartAlt } from '@mui/icons-material';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { selectCurrentContest } from '../../../features/contests/contestSelectors';
import { useAppSelector } from '../../../hooks/reduxHooks';
import { squareFor } from '../../../utils/squareFor';
import ContestSidebarCard from './ContestSidebarCard';

const PLAYS = [
  { points: 7, label: 'TD' },
  { points: 3, label: 'FG' },
  { points: 2, label: 'Safety' },
  { points: 1, label: 'XP' },
];

function TeamRow({
  name,
  score,
  onScore,
}: {
  name: string;
  score: number;
  onScore: (points: number) => void;
}) {
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography noWrap sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', mr: 1 }}>
          {name}
        </Typography>
        <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1.25rem' }}>
          {score}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
        {PLAYS.map((play) => (
          <Button
            key={play.label}
            size="small"
            variant="outlined"
            onClick={() => onScore(play.points)}
            aria-label={`${name} ${play.label}`}
            sx={{
              flex: 1,
              minWidth: 0,
              px: 0,
              fontSize: '0.68rem',
              color: 'rgba(255,255,255,0.8)',
              borderColor: 'rgba(255,255,255,0.15)',
            }}
          >
            +{play.points} {play.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}

export default function WhatIfScoreboard() {
  const auth = useAuth();
  const contest = useAppSelector(selectCurrentContest);
  const liveHome = contest?.game?.homeScore ?? 0;
  const liveAway = contest?.game?.awayScore ?? 0;

  const [scores, setScores] = useState<{ home: number; away: number } | null>(null);

  if (!contest) {
    return null;
  }

  const home = scores?.home ?? liveHome;
  const away = scores?.away ?? liveAway;
  const labels = [...(contest.xLabels ?? []), ...(contest.yLabels ?? [])];
  const numbersDrawn = labels.length === 20 && labels.every((n) => n >= 0);
  const result = numbersDrawn ? squareFor(contest, home, away) : null;
  const owner = result?.square?.owner;
  const isMine = !!owner && owner === auth.user?.profile?.email;

  const add = (team: 'home' | 'away', points: number) =>
    setScores({ home, away, [team]: (team === 'home' ? home : away) + points });

  return (
    <ContestSidebarCard icon={<Casino fontSize="inherit" />} iconColor="#f6c344" title="What if?">
      <TeamRow name={contest.homeTeam || 'Home'} score={home} onScore={(p) => add('home', p)} />
      <TeamRow name={contest.awayTeam || 'Away'} score={away} onScore={(p) => add('away', p)} />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mt: 1,
          p: 1,
          borderRadius: 1.5,
          backgroundColor: isMine ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.04)',
        }}
      >
        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
          {!numbersDrawn
            ? 'Numbers are drawn when the grid locks'
            : isMine
              ? `That's your square at ${home}–${away}!`
              : owner
                ? `${result?.square?.ownerName || result?.square?.value} wins at ${home}–${away}`
                : `Nobody has that square at ${home}–${away}`}
        </Typography>
        <Tooltip title="Back to the real score">
          <IconButton
            size="small"
            aria-label="Reset scores"
            onClick={() => setScores(null)}
            sx={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <RestartAlt fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </ContestSidebarCard>
  );
}
