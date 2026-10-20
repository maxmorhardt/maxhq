import { Box, Container, Typography } from '@mui/material';
import Reveal from '../../../components/Reveal';
import LandingCreateContestButton from './LandingCreateContestButton';

export default function LandingCallToAction() {
  return (
    <Box
      component="section"
      sx={{ position: 'relative', overflow: 'hidden', py: { xs: 10, md: 14 }, textAlign: 'center' }}
    >
      {/* the glow of a lit field below the fold */}
      <Box
        aria-hidden
        sx={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(50% 70% at 50% 110%, rgba(61, 155, 255, 0.18), transparent 70%)',
        }}
      />

      <Container maxWidth="md" sx={{ position: 'relative' }}>
        <Reveal>
          <Typography variant="h2" sx={{ fontSize: 'clamp(2.8rem, 7vw, 5rem)' }}>
            Kickoff is coming.
            <br />
            Get your board up.
          </Typography>
        </Reveal>
        <Reveal delay={100}>
          <Typography
            sx={{
              mt: 3,
              mx: 'auto',
              maxWidth: '44ch',
              color: 'text.secondary',
              fontSize: '1.12rem',
            }}
          >
            It takes a couple of minutes to create a contest. Send the link, and let the group chat
            fill the squares.
          </Typography>
        </Reveal>
        <Reveal delay={200} sx={{ mt: 4.5 }}>
          <LandingCreateContestButton />
        </Reveal>
      </Container>
    </Box>
  );
}
