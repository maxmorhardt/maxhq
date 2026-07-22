import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import type { LeaderboardEntry } from '../../types/leaderboard';
import { leaderboardKey } from '../../utils/publicName';
import { stripDangerousChars } from '../../utils/sanitize';
import { popIn } from '../profile/animations';

export const PODIUM_SIZE = 3;

const PODIUM_STYLES: Record<number, { color: string; height: number; delay: number }> = {
  1: { color: '#ffd700', height: 196, delay: 0 },
  // a true silver reads as plain grey against the dark surface, so it is cooled and brightened
  2: { color: '#dbe3f5', height: 158, delay: 0.1 },
  3: { color: '#e08c47', height: 138, delay: 0.2 },
};

// the winner sits in the middle on desktop, but stays first when the row stacks
const DESKTOP_ORDER: Record<number, number> = { 1: 2, 2: 1, 3: 3 };

interface Props {
  entries: LeaderboardEntry[];
  highlightKey?: string;
}

export default function LeaderboardPodium({ entries, highlightKey }: Props) {
  const theme = useTheme();

  if (entries.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-end' },
        justifyContent: 'center',
        gap: { xs: 1.5, sm: 2 },
        mb: 4,
      }}
    >
      {entries.map((entry) => {
        const style = PODIUM_STYLES[entry.rank] ?? PODIUM_STYLES[3];
        const isMe =
          Boolean(highlightKey) && leaderboardKey(entry.rank, entry.displayName) === highlightKey;
        const name = stripDangerousChars(entry.displayName);

        return (
          <Paper
            key={`${entry.rank}-${entry.displayName}`}
            elevation={0}
            sx={{
              flex: 1,
              minWidth: 0,
              order: { xs: 'unset', sm: DESKTOP_ORDER[entry.rank] ?? 3 },
              minHeight: { xs: 'auto', sm: style.height },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              px: 2,
              py: { xs: 2, sm: 2.5 },
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
              background: `linear-gradient(160deg, ${style.color}1f 0%, rgba(255,255,255,0.03) 55%)`,
              border: `1px solid ${style.color}${isMe ? 'aa' : '44'}`,
              boxShadow: `0 12px 34px ${style.color}1a`,
              animation: `${popIn} 0.5s ease-out ${style.delay}s both`,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 18px 42px ${style.color}33`,
              },
            }}
          >
            {/* glow behind the medal */}
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: -46,
                width: 130,
                height: 130,
                borderRadius: '50%',
                background: style.color,
                opacity: 0.14,
                filter: 'blur(26px)',
              }}
            />

            <EmojiEventsIcon
              sx={{ fontSize: entry.rank === 1 ? 34 : 27, color: style.color, mb: 0.5 }}
            />

            <Box
              sx={{
                width: entry.rank === 1 ? 52 : 44,
                height: entry.rank === 1 ? 52 : 44,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1,
                background: `linear-gradient(135deg, ${style.color}55 0%, ${style.color}22 100%)`,
                border: `1px solid ${style.color}66`,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: entry.rank === 1 ? '1.3rem' : '1.1rem',
                  color: style.color,
                }}
              >
                {(name.charAt(0) || '?').toUpperCase()}
              </Typography>
            </Box>

            <Typography
              noWrap
              sx={{ fontWeight: 700, maxWidth: '100%', color: isMe ? 'primary.light' : 'inherit' }}
            >
              {name}
            </Typography>

            <Typography
              sx={{
                fontWeight: 900,
                lineHeight: 1.1,
                fontSize: entry.rank === 1 ? '2rem' : '1.6rem',
                background: `linear-gradient(135deg, ${style.color} 0%, #ffffff 140%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {entry.quarterWins.toLocaleString()}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 700,
              }}
            >
              {entry.quarterWins === 1 ? 'Win' : 'Wins'}
            </Typography>

            {isMe && (
              <Typography
                variant="caption"
                sx={{
                  mt: 0.75,
                  px: 1,
                  py: 0.25,
                  borderRadius: 5,
                  fontWeight: 700,
                  color: theme.palette.primary.light,
                  border: `1px solid ${theme.palette.primary.main}66`,
                }}
              >
                You
              </Typography>
            )}
          </Paper>
        );
      })}
    </Box>
  );
}
