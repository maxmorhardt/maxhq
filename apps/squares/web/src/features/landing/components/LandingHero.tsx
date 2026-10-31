import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { game } from '../../../app/theme';
import Reveal from '../../../components/Reveal';
import DemoBoard, { type DemoStage } from './DemoBoard';
import LandingCreateContestButton from './LandingCreateContestButton';

// when each stage of the opening demo lands, in ms after mount
const SEQUENCE: [DemoStage, number][] = [
  [1, 500],
  [2, 1900],
  [3, 2700],
  [4, 3800],
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false);

export default function LandingHero() {
  const [stage, setStage] = useState<DemoStage>(0);

  useEffect(() => {
    const sequence: [DemoStage, number][] = prefersReducedMotion() ? [[4, 0]] : SEQUENCE;
    const timers = sequence.map(([next, at]) => setTimeout(() => setStage(next), at));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        pt: { xs: 6, md: 10 },
        pb: { xs: 8, md: 12 },
      }}
    >
      {/* stadium light spilling over the board */}
      <Box
        aria-hidden
        sx={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(40% 60% at 78% 40%, rgba(61, 155, 255, 0.12), transparent 70%), radial-gradient(30% 40% at 85% 75%, rgba(247, 201, 72, 0.07), transparent 70%)`,
        }}
      />

      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: { md: 'minmax(0, 1fr) minmax(0, 1fr)' },
          alignItems: 'center',
          gap: { xs: 6, md: 8 },
        }}
      >
        <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
          <Reveal>
            <Typography
              variant="h1"
              sx={{
                fontSize: 'clamp(3.2rem, 7.4vw, 6rem)',
                maxWidth: '11ch',
                mx: { xs: 'auto', md: 0 },
              }}
            >
              The squares pool,{' '}
              <Box component="span" sx={{ color: 'primary.main' }}>
                live
              </Box>{' '}
              on every phone.
            </Typography>
          </Reveal>

          <Reveal delay={100}>
            <Typography
              sx={{
                mt: 3,
                maxWidth: '46ch',
                mx: { xs: 'auto', md: 0 },
                fontSize: { xs: '1.08rem', md: '1.2rem' },
                lineHeight: 1.6,
                color: 'text.secondary',
              }}
            >
              Set up a ten by ten board for any NFL game, share one link, and watch the numbers drop
              and the winners light up for everyone in real time.
            </Typography>
          </Reveal>

          <Reveal
            delay={200}
            sx={{
              mt: 4.5,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.5,
              justifyContent: { xs: 'center', md: 'flex-start' },
            }}
          >
            <LandingCreateContestButton />
            <Button
              component={Link}
              to="/learn-more"
              variant="outlined"
              color="inherit"
              size="large"
            >
              Learn More
            </Button>
          </Reveal>

          <Reveal delay={300}>
            <Typography
              sx={{
                mt: 3,
                fontSize: '0.92rem',
                color: 'text.secondary',
                '& b': { color: game.chalk, fontWeight: 600 },
              }}
            >
              <b>Free</b> · nothing to install · sign in with Google, Microsoft, or GitHub
            </Typography>
          </Reveal>
        </Box>

        <Reveal delay={150} sx={{ display: 'flex', justifyContent: 'center' }}>
          <DemoBoard stage={stage} />
        </Reveal>
      </Container>
    </Box>
  );
}
