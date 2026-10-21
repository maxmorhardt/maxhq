import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { popIn } from '../../../components/animations';
import { easing, fonts, game as palette } from '../../../app/theme';
import type { LeaderboardEntry } from '../../../types/leaderboard';
import { leaderboardKey } from '../../../utils/publicName';
import { stripDangerousChars } from '../../../utils/sanitize';

export const PODIUM_SIZE = 3;

const MEDALS: Record<number, { color: string; place: string }> = {
  1: { color: palette.gold, place: '1st' },
  2: { color: '#c9d3e6', place: '2nd' },
  3: { color: '#e0915a', place: '3rd' },
};

function winRate(entry: LeaderboardEntry) {
  return entry.quartersPlayed > 0
    ? `${Math.round((entry.quarterWins / entry.quartersPlayed) * 100)}%`
    : '–';
}

interface Props {
  entries: LeaderboardEntry[];
  highlightKey?: string;
}

// the top three as trading cards: the place, the player, and their line of stats
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
        mb: { xs: 4, md: 5 },
        p: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
        gap: { xs: 1.5, md: 2 },
      }}
    >
      {entries.map((entry, i) => {
        const medal = MEDALS[entry.rank] ?? MEDALS[3];
        const isMe =
          Boolean(highlightKey) && leaderboardKey(entry.rank, entry.displayName) === highlightKey;
        const name = stripDangerousChars(entry.displayName);
        const stats = [
          {
            value: entry.quarterWins.toLocaleString(),
            label: entry.quarterWins === 1 ? 'Win' : 'Wins',
          },
          { value: entry.squaresClaimed.toLocaleString(), label: 'Squares' },
          { value: winRate(entry), label: 'Win rate' },
        ];

        return (
          <Box
            component="li"
            key={`${entry.rank}-${entry.displayName}`}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '18px',
              border: 1,
              borderColor: alpha(medal.color, isMe ? 0.8 : 0.35),
              background: `linear-gradient(170deg, ${alpha(medal.color, 0.16)} 0%, ${palette.field} 45%)`,
              boxShadow: entry.rank === 1 ? `0 24px 60px -30px ${alpha(medal.color, 0.6)}` : 'none',
              animation: `${popIn} 0.55s ${easing.out} ${i * 0.08}s both`,
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          >
            {/* the place, large and faint, behind the card */}
            <Typography
              aria-hidden
              sx={{
                position: 'absolute',
                right: -6,
                top: -18,
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: '7.5rem',
                lineHeight: 1,
                color: alpha(medal.color, 0.1),
                pointerEvents: 'none',
              }}
            >
              {entry.rank}
            </Typography>

            <Box sx={{ position: 'relative', p: { xs: 2, md: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmojiEventsIcon sx={{ fontSize: 20, color: medal.color }} />
                <Typography
                  sx={{
                    fontFamily: fonts.display,
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: medal.color,
                  }}
                >
                  {medal.place}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
                <Box
                  aria-hidden
                  sx={{
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '14px',
                    fontFamily: fonts.display,
                    fontWeight: 800,
                    fontSize: '1.5rem',
                    color: palette.night,
                    bgcolor: medal.color,
                  }}
                >
                  {(name.charAt(0) || '?').toUpperCase()}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                    {name}
                  </Typography>
                  {isMe && (
                    <Typography
                      component="span"
                      sx={{
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

              <Box
                component="dl"
                sx={{
                  m: 0,
                  mt: 2.5,
                  pt: 2,
                  borderTop: 1,
                  borderColor: alpha(medal.color, 0.2),
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                }}
              >
                {stats.map((stat, s) => (
                  // the label comes first for screen readers and sits under the number on screen
                  <Box
                    key={stat.label}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column-reverse',
                      alignItems: s === 0 ? 'flex-start' : s === 2 ? 'flex-end' : 'center',
                    }}
                  >
                    <Box
                      component="dt"
                      sx={{
                        mt: 0.5,
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {stat.label}
                    </Box>
                    <Box
                      component="dd"
                      sx={{
                        m: 0,
                        fontFamily: fonts.display,
                        fontWeight: 800,
                        fontSize: s === 0 ? '1.9rem' : '1.35rem',
                        lineHeight: 1,
                        color: s === 0 ? medal.color : 'text.primary',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {stat.value}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
