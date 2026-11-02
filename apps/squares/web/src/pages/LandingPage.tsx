import { Box } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import LandingCallToAction from '../features/landing/components/LandingCallToAction';
import LandingFeatures from '../features/landing/components/LandingFeatures';
import LandingHero from '../features/landing/components/LandingHero';
import LandingPlaybook from '../features/landing/components/LandingPlaybook';
import LandingScoreboard from '../features/landing/components/LandingScoreboard';

export default function LandingPage() {
  return (
    <Box sx={{ overflowX: 'clip' }}>
      <Helmet>
        <title>Squares – Free Football Squares for NFL Game Day</title>
        <meta
          name="description"
          content="Run a free football squares game for any NFL game. Friends claim squares from their phones and the live score picks each quarter's square. No money involved."
        />
        <link rel="canonical" href="https://squares.maxhq.io/" />
      </Helmet>
      <LandingHero />
      <LandingPlaybook />
      <LandingScoreboard />
      <LandingFeatures />
      <LandingCallToAction />
    </Box>
  );
}
