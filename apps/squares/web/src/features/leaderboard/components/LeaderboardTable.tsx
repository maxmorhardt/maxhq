import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { fonts, game as palette } from '../../../app/theme';
import type { LeaderboardEntry } from '../../../types/leaderboard';
import { leaderboardKey } from '../../../utils/publicName';
import { stripDangerousChars } from '../../../utils/sanitize';
import LeaderboardEmptyState from './LeaderboardEmptyState';
import LeaderboardTableSkeleton from './LeaderboardTableSkeleton';

interface Props {
  entries: LeaderboardEntry[];
  loading: boolean;
  highlightKey?: string;
  // the leader's wins, so every bar is measured against first place
  maxWins?: number;
}

// share of the quarters the player had a stake in that they actually won
function winRate(entry: LeaderboardEntry) {
  if (entry.quartersPlayed <= 0) {
    return '–';
  }

  return `${((entry.quarterWins / entry.quartersPlayed) * 100).toFixed(0)}%`;
}

const COLUMNS = { xs: '36px minmax(0, 1fr)', sm: '44px minmax(0, 1fr) 76px 76px' };

const headSx = {
  color: 'text.secondary',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
} as const;

// everyone below the podium as a race of bars: each bar runs as far as its wins reach toward the leader's
export default function LeaderboardTable({ entries, loading, highlightKey, maxWins }: Props) {
  if (loading) {
    return <LeaderboardTableSkeleton />;
  }

  if (entries.length === 0) {
    return <LeaderboardEmptyState />;
  }

  const top = Math.max(maxWins ?? 0, ...entries.map((e) => e.quarterWins), 1);

  return (
    <Box>
      <Box
        aria-hidden
        sx={{
          display: { xs: 'none', sm: 'grid' },
          gridTemplateColumns: COLUMNS.sm,
          gap: 1.5,
          px: 0.5,
          pb: 1,
        }}
      >
        <Box sx={headSx}>Rank</Box>
        <Box sx={headSx}>Player · Wins</Box>
        <Box sx={{ ...headSx, textAlign: 'right' }}>Squares</Box>
        <Box sx={{ ...headSx, textAlign: 'right' }}>Win Rate</Box>
      </Box>

      <Box
        component="ol"
        aria-label="Standings"
        sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}
      >
        {entries.map((entry) => {
          const isMe =
            Boolean(highlightKey) && leaderboardKey(entry.rank, entry.displayName) === highlightKey;
          const name = stripDangerousChars(entry.displayName);
          const reach = Math.max((entry.quarterWins / top) * 100, 6);

          return (
            <Box
              component="li"
              key={`${entry.rank}-${entry.displayName}`}
              aria-label={`${entry.rank}. ${name}, ${entry.quarterWins} ${entry.quarterWins === 1 ? 'win' : 'wins'}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: COLUMNS,
                alignItems: 'center',
                gap: 1.5,
                px: 0.5,
              }}
            >
              <Typography
                sx={{
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: '1.35rem',
                  color: isMe ? 'primary.light' : 'text.secondary',
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'center',
                }}
              >
                {entry.rank}
              </Typography>

              {/* the bar and the name and wins riding on it */}
              <Box
                sx={{
                  position: 'relative',
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: alpha(palette.chalk, 0.03),
                  border: 1,
                  borderColor: isMe ? alpha(palette.brand, 0.6) : 'divider',
                  overflow: 'hidden',
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: `${reach}%`,
                    background: `linear-gradient(90deg, ${alpha(palette.brand, isMe ? 0.45 : 0.22)}, ${alpha(palette.brand, isMe ? 0.25 : 0.08)})`,
                    borderRight: 2,
                    borderColor: alpha(palette.brand, isMe ? 0.9 : 0.5),
                  }}
                />
                <Box
                  sx={{
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    px: 1.5,
                  }}
                >
                  <Typography noWrap sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
                    {name}
                  </Typography>
                  {isMe && (
                    <Typography
                      component="span"
                      sx={{
                        flexShrink: 0,
                        px: 0.9,
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'primary.light',
                        bgcolor: alpha(palette.brand, 0.18),
                      }}
                    >
                      You
                    </Typography>
                  )}
                  <Typography
                    sx={{
                      flexShrink: 0,
                      fontFamily: fonts.display,
                      fontWeight: 800,
                      fontSize: '1.3rem',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {entry.quarterWins.toLocaleString()}
                  </Typography>
                </Box>
              </Box>

              <Typography
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  textAlign: 'right',
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
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
