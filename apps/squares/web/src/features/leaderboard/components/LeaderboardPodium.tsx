import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { popIn } from '../../../components/animations';
import { easing, fonts, game as palette } from '../../../app/theme';
import type { LeaderboardEntry } from '../../../types/leaderboard';
import { leaderboardKey } from '../../../utils/publicName';
import { stripDangerousChars } from '../../../utils/sanitize';

export const PODIUM_SIZE = 3;

const PLACES: Record<number, { color: string; step: number; delay: number }> = {
  1: { color: palette.gold, step: 132, delay: 0.1 },
  2: { color: '#c9d3e6', step: 96, delay: 0 },
  3: { color: '#e0915a', step: 72, delay: 0.2 },
};

// the winner stands in the middle on desktop, but stays first when the podium stacks
const DESKTOP_ORDER: Record<number, number> = { 1: 2, 2: 1, 3: 3 };

interface Props {
  entries: LeaderboardEntry[];
  highlightKey?: string;
}

export default function LeaderboardPodium({ entries, highlightKey }: Props) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <Box
      component="ol"
      aria-label="Top three"
      sx={{
        listStyle: 'none',
        m: 0,
        mb: { xs: 3, sm: 5 },
        p: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
        alignItems: 'end',
        gap: { xs: 1.25, sm: 1.5 },
      }}
    >
      {entries.map((entry) => {
        const place = PLACES[entry.rank] ?? PLACES[3];
        const isMe =
          Boolean(highlightKey) && leaderboardKey(entry.rank, entry.displayName) === highlightKey;
        const name = stripDangerousChars(entry.displayName);
        const first = entry.rank === 1;

        return (
          <Box
            component="li"
            key={`${entry.rank}-${entry.displayName}`}
            sx={{
              order: { xs: 'unset', sm: DESKTOP_ORDER[entry.rank] ?? 3 },
              display: 'flex',
              flexDirection: { xs: 'row-reverse', sm: 'column' },
              alignItems: 'stretch',
              minWidth: 0,
              borderRadius: { xs: '16px', sm: 0 },
              border: { xs: 1, sm: 0 },
              borderColor: { xs: alpha(place.color, isMe ? 0.7 : 0.3) },
              overflow: { xs: 'hidden', sm: 'visible' },
              animation: `${popIn} 0.6s ${easing.out} ${place.delay}s both`,
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          >
            {/* the player standing on the step */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: { xs: 'row', sm: 'column' },
                alignItems: 'center',
                gap: { xs: 1.5, sm: 0.75 },
                px: { xs: 2, sm: 1 },
                py: { xs: 1.5, sm: 2 },
                textAlign: { xs: 'left', sm: 'center' },
              }}
            >
              <Box
                aria-hidden
                sx={{
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  width: { xs: 40, sm: first ? 64 : 52 },
                  height: { xs: 40, sm: first ? 64 : 52 },
                  borderRadius: '50%',
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: { xs: '1.2rem', sm: first ? '1.9rem' : '1.5rem' },
                  color: place.color,
                  bgcolor: alpha(place.color, 0.12),
                  border: 2,
                  borderColor: alpha(place.color, 0.7),
                  boxShadow: first ? `0 0 32px ${alpha(place.color, 0.35)}` : 'none',
                }}
              >
                {(name.charAt(0) || '?').toUpperCase()}
              </Box>

              <Box sx={{ minWidth: 0, flex: { xs: 1, sm: 'none' }, maxWidth: '100%' }}>
                <Typography
                  noWrap
                  sx={{ fontWeight: 700, color: isMe ? 'primary.light' : 'text.primary' }}
                >
                  {name}
                </Typography>
                {isMe && (
                  <Typography
                    component="span"
                    sx={{
                      display: 'inline-block',
                      mt: 0.25,
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

              <Box sx={{ textAlign: { xs: 'right', sm: 'center' }, flexShrink: 0 }}>
                <Typography
                  sx={{
                    fontFamily: fonts.display,
                    fontWeight: 800,
                    lineHeight: 1,
                    fontSize: { xs: '1.6rem', sm: first ? '2.6rem' : '2.1rem' },
                    color: first ? place.color : 'text.primary',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {entry.quarterWins.toLocaleString()}
                </Typography>
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  {entry.quarterWins === 1 ? 'Win' : 'Wins'}
                </Typography>
              </Box>
            </Box>

            {/* the step itself, carrying the place */}
            <Box
              aria-hidden
              sx={{
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                width: { xs: 56, sm: 'auto' },
                height: { xs: 'auto', sm: place.step },
                borderRadius: { xs: 0, sm: '14px 14px 0 0' },
                background: `linear-gradient(180deg, ${alpha(place.color, 0.28)} 0%, ${alpha(place.color, 0.04)} 100%)`,
                borderTop: { xs: 0, sm: `3px solid ${place.color}` },
                borderRight: { xs: `3px solid ${place.color}`, sm: 0 },
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: { xs: '1.8rem', sm: first ? '4rem' : '3.2rem' },
                lineHeight: 1,
                color: alpha(place.color, 0.9),
              }}
            >
              {entry.rank}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
