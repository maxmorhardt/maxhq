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
  // the leader's wins, so the bars measure everyone against first place
  maxWins?: number;
}

// share of the quarters the player had a stake in that they actually won
function winRate(entry: LeaderboardEntry) {
  if (entry.quartersPlayed <= 0) {
    return '–';
  }

  return `${((entry.quarterWins / entry.quartersPlayed) * 100).toFixed(0)}%`;
}

const wide = { display: { xs: 'none', sm: 'table-cell' } };

const cellSx = {
  py: 1.5,
  px: { xs: 1.25, sm: 2 },
  borderBottom: 1,
  borderColor: 'divider',
  textAlign: 'left',
} as const;

const headSx = {
  ...cellSx,
  py: 1.25,
  color: 'text.secondary',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  bgcolor: alpha(palette.chalk, 0.02),
} as const;

const numSx = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } as const;

export default function LeaderboardTable({ entries, loading, highlightKey, maxWins }: Props) {
  if (loading) {
    return <LeaderboardTableSkeleton />;
  }

  if (entries.length === 0) {
    return <LeaderboardEmptyState />;
  }

  const top = Math.max(maxWins ?? 0, ...entries.map((e) => e.quarterWins), 1);

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: '18px',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        component="table"
        sx={{
          width: '100%',
          borderCollapse: 'collapse',
          '& tbody tr:last-of-type td': { borderBottom: 0 },
        }}
      >
        <thead>
          <tr>
            <Box component="th" scope="col" sx={{ ...headSx, width: { xs: 40, sm: 64 } }}>
              Rank
            </Box>
            <Box component="th" scope="col" sx={headSx}>
              Player
            </Box>
            <Box component="th" scope="col" sx={{ ...headSx, ...numSx, width: { sm: 200 } }}>
              Wins
            </Box>
            <Box component="th" scope="col" sx={{ ...headSx, ...numSx, ...wide }}>
              Squares
            </Box>
            <Box component="th" scope="col" sx={{ ...headSx, ...numSx, ...wide }}>
              Win Rate
            </Box>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isMe =
              Boolean(highlightKey) &&
              leaderboardKey(entry.rank, entry.displayName) === highlightKey;
            const name = stripDangerousChars(entry.displayName);

            return (
              <Box
                component="tr"
                key={`${entry.rank}-${entry.displayName}`}
                sx={{
                  bgcolor: isMe ? alpha(palette.brand, 0.1) : 'transparent',
                  boxShadow: isMe ? `inset 3px 0 0 ${palette.brand}` : 'none',
                  transition: 'background-color 160ms',
                  '&:hover': {
                    bgcolor: isMe ? alpha(palette.brand, 0.14) : alpha(palette.chalk, 0.03),
                  },
                }}
              >
                <Box
                  component="td"
                  sx={{
                    ...cellSx,
                    fontFamily: fonts.display,
                    fontWeight: 800,
                    fontSize: '1.25rem',
                    color: 'text.secondary',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {entry.rank}
                </Box>

                <Box component="td" sx={{ ...cellSx, maxWidth: 0, width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <Box
                      aria-hidden
                      sx={{
                        flexShrink: 0,
                        display: { xs: 'none', sm: 'grid' },
                        placeItems: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color: isMe ? 'primary.light' : 'text.secondary',
                        bgcolor: alpha(palette.chalk, 0.06),
                        border: 1,
                        borderColor: isMe ? alpha(palette.brand, 0.5) : 'divider',
                      }}
                    >
                      {(name.charAt(0) || '?').toUpperCase()}
                    </Box>
                    <Typography noWrap sx={{ fontWeight: 600 }}>
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
                          bgcolor: alpha(palette.brand, 0.14),
                        }}
                      >
                        You
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box component="td" sx={{ ...cellSx, ...numSx }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 1.5,
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        display: { xs: 'none', sm: 'block' },
                        width: 110,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: alpha(palette.chalk, 0.06),
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${(entry.quarterWins / top) * 100}%`,
                          height: '100%',
                          borderRadius: 3,
                          bgcolor: isMe ? palette.brand : alpha(palette.brand, 0.55),
                        }}
                      />
                    </Box>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: fonts.display,
                        fontWeight: 800,
                        fontSize: '1.2rem',
                        minWidth: 28,
                      }}
                    >
                      {entry.quarterWins.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>

                <Box component="td" sx={{ ...cellSx, ...numSx, ...wide, color: 'text.secondary' }}>
                  {entry.squaresClaimed.toLocaleString()}
                </Box>

                <Box
                  component="td"
                  sx={{ ...cellSx, ...numSx, ...wide, fontWeight: 700, color: 'primary.light' }}
                >
                  {winRate(entry)}
                </Box>
              </Box>
            );
          })}
        </tbody>
      </Box>
    </Box>
  );
}
