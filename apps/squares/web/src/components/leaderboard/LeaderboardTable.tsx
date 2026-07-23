import { Box, Paper, Typography, useTheme } from '@mui/material';
import type { LeaderboardEntry } from '../../types/leaderboard';
import { leaderboardKey } from '../../utils/publicName';
import { stripDangerousChars } from '../../utils/sanitize';
import { popIn } from '../profile/animations';
import LeaderboardEmptyState from './LeaderboardEmptyState';
import LeaderboardTableSkeleton from './LeaderboardTableSkeleton';
import { GRID_COLUMNS, ROW_GAP } from './leaderboardLayout';

// rows animate in sequence, but only for the first screenful so long lists stay snappy
const MAX_STAGGERED_ROWS = 12;
const STAGGER_STEP = 0.04;

interface Props {
  entries: LeaderboardEntry[];
  loading: boolean;
  highlightKey?: string;
}

// share of the quarters the player had a stake in that they actually won
function winRate(entry: LeaderboardEntry) {
  if (entry.quartersPlayed <= 0) {
    return '–';
  }

  return `${((entry.quarterWins / entry.quartersPlayed) * 100).toFixed(0)}%`;
}

export default function LeaderboardTable({ entries, loading, highlightKey }: Props) {
  const theme = useTheme();

  if (loading) {
    return <LeaderboardTableSkeleton />;
  }

  if (entries.length === 0) {
    return <LeaderboardEmptyState />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
      {/* column headers, hidden on mobile where the row layout collapses */}
      <Box
        sx={{
          display: { xs: 'none', sm: 'grid' },
          gridTemplateColumns: GRID_COLUMNS.sm,
          gap: 1,
          px: 2.5,
          pb: 0.5,
        }}
      >
        {['Rank', 'Player', 'Wins', 'Squares', 'Win Rate'].map((heading, i) => (
          <Typography
            key={heading}
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              opacity: 0.7,
              textAlign: i >= 2 ? 'right' : 'left',
            }}
          >
            {heading}
          </Typography>
        ))}
      </Box>

      {entries.map((entry, i) => {
        const isMe =
          Boolean(highlightKey) && leaderboardKey(entry.rank, entry.displayName) === highlightKey;
        const name = stripDangerousChars(entry.displayName);

        return (
          <Paper
            key={`${entry.rank}-${entry.displayName}`}
            elevation={0}
            sx={{
              display: 'grid',
              gridTemplateColumns: GRID_COLUMNS,
              alignItems: 'center',
              gap: 1,
              px: 2.5,
              py: 1.35,
              borderRadius: 2.5,
              background: isMe
                ? `linear-gradient(135deg, ${theme.palette.primary.dark}38 0%, ${theme.palette.primary.main}1a 100%)`
                : 'rgba(255,255,255,0.035)',
              border: isMe
                ? `1px solid ${theme.palette.primary.main}66`
                : '1px solid rgba(255,255,255,0.06)',
              animation:
                i < MAX_STAGGERED_ROWS
                  ? `${popIn} 0.4s ease-out ${i * STAGGER_STEP}s both`
                  : undefined,
              transition: 'background 0.2s ease, border-color 0.2s ease',
              '&:hover': {
                background: isMe
                  ? `linear-gradient(135deg, ${theme.palette.primary.dark}48 0%, ${theme.palette.primary.main}26 100%)`
                  : 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.14)',
              },
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                color: 'text.secondary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {entry.rank}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Box
                sx={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: isMe ? theme.palette.primary.light : 'text.secondary',
                }}
              >
                {(name.charAt(0) || '?').toUpperCase()}
              </Box>
              <Typography noWrap sx={{ fontWeight: 600 }}>
                {name}
              </Typography>
              {isMe && (
                <Typography
                  variant="caption"
                  sx={{
                    flexShrink: 0,
                    px: 0.85,
                    borderRadius: 5,
                    fontWeight: 700,
                    color: theme.palette.primary.light,
                    border: `1px solid ${theme.palette.primary.main}55`,
                  }}
                >
                  You
                </Typography>
              )}
            </Box>

            <Typography
              sx={{ fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
            >
              {entry.quarterWins.toLocaleString()}
              <Box component="span" sx={{ display: { sm: 'none' }, color: 'text.secondary' }}>
                {' '}
                wins
              </Box>
            </Typography>

            <Typography
              sx={{
                display: { xs: 'none', sm: 'block' },
                textAlign: 'right',
                fontWeight: 600,
                color: 'text.secondary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {entry.squaresClaimed.toLocaleString()}
            </Typography>

            <Typography
              sx={{
                display: { xs: 'none', sm: 'block' },
                textAlign: 'right',
                fontWeight: 700,
                color: 'primary.light',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {winRate(entry)}
            </Typography>
          </Paper>
        );
      })}
    </Box>
  );
}
