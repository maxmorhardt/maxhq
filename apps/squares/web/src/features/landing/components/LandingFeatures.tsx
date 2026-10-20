import { GridView, PersonAdd, PlayArrow, SportsScore } from '@mui/icons-material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Box, Container, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { fonts, game } from '../../../app/theme';
import Reveal from '../../../components/Reveal';

interface Feature {
  title: string;
  body: string;
}

const features: Feature[] = [
  {
    title: 'Live on every screen',
    body: 'Claims, scores, and winners stream to every phone the moment they happen. No refreshing, no group-chat screenshots.',
  },
  {
    title: 'Real scores, called for you',
    body: 'Every contest follows a live NFL game: the score updates on its own, and each quarter’s winner is worked out automatically.',
  },
  {
    title: 'Your pool, your rules',
    body: 'Private or public, invite links with limits and expiry, and a per-person cap on how many squares each player can claim.',
  },
  {
    title: 'Free, with nothing to install',
    body: 'It runs in the browser on any phone or laptop. Sign in with Google or GitHub and you are on the board.',
  },
];

interface FeedLine {
  icon: ReactNode;
  text: ReactNode;
  time: string;
}

const iconSx = { fontSize: '1rem' } as const;

// an illustrative feed in the shape of the real contest activity panel
const feed: FeedLine[] = [
  {
    icon: <PersonAdd sx={{ ...iconSx, color: 'primary.main' }} />,
    text: 'Jordan joined the contest',
    time: '6:58 PM',
  },
  {
    icon: <GridView sx={{ ...iconSx, color: 'info.main' }} />,
    text: 'JD claimed home 4, away 7',
    time: '7:02 PM',
  },
  {
    icon: <PlayArrow sx={{ ...iconSx, color: 'warning.main' }} />,
    text: 'Numbers drawn. Game on.',
    time: '8:20 PM',
  },
  {
    icon: <SportsScore sx={{ ...iconSx, color: 'primary.main' }} />,
    text: 'Score update: away 7, home 14',
    time: '9:41 PM',
  },
  {
    icon: <EmojiEventsIcon sx={{ ...iconSx, color: 'secondary.main' }} />,
    text: (
      <>
        <b>JD</b> wins the 2nd quarter
      </>
    ),
    time: '9:43 PM',
  },
];

export default function LandingFeatures() {
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <Container
        maxWidth="lg"
        sx={{
          display: 'grid',
          gridTemplateColumns: { md: 'minmax(0, 1.15fr) minmax(0, 0.85fr)' },
          gap: { xs: 6, md: 10 },
          alignItems: 'center',
        }}
      >
        <Box>
          <Reveal>
            <Typography variant="h2" sx={{ fontSize: 'clamp(2.6rem, 5.6vw, 4.4rem)' }}>
              Built for game day
            </Typography>
          </Reveal>

          <Box
            sx={{
              mt: 5,
              display: 'grid',
              gridTemplateColumns: { sm: '1fr 1fr' },
              columnGap: 5,
            }}
          >
            {features.map((feature, i) => (
              <Reveal
                key={feature.title}
                delay={i * 80}
                sx={{ py: 3, borderTop: 1, borderColor: 'divider' }}
              >
                <Typography variant="h3" sx={{ fontSize: '1.55rem', lineHeight: 1.05 }}>
                  {feature.title}
                </Typography>
                <Typography sx={{ mt: 1.25, color: 'text.secondary', lineHeight: 1.6 }}>
                  {feature.body}
                </Typography>
              </Reveal>
            ))}
          </Box>
        </Box>

        <Reveal delay={150}>
          <Box
            role="figure"
            aria-label="Example contest activity"
            sx={{
              p: 2.5,
              borderRadius: '18px',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              boxShadow: '0 40px 90px -40px rgba(0, 0, 0, 0.9)',
            }}
          >
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
            >
              <Typography
                sx={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Activity
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'primary.main',
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    animation: 'live-pulse 2s ease-in-out infinite',
                    '@keyframes live-pulse': {
                      '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(game.brand, 0.5)}` },
                      '50%': { boxShadow: `0 0 0 6px ${alpha(game.brand, 0)}` },
                    },
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }}
                />
                Live
              </Box>
            </Box>

            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
              {feed.map((line, i) => (
                <Box
                  key={i}
                  component="li"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 1.5,
                    py: 1.25,
                    borderRadius: '10px',
                    bgcolor: i === feed.length - 1 ? alpha(game.gold, 0.1) : game.stand,
                    border: 1,
                    borderColor: i === feed.length - 1 ? alpha(game.gold, 0.4) : 'transparent',
                  }}
                >
                  {line.icon}
                  <Typography sx={{ flex: 1, fontSize: '0.92rem', '& b': { fontWeight: 700 } }}>
                    {line.text}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.78rem',
                      color: 'text.secondary',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {line.time}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}
