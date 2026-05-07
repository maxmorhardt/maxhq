import { Box } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import LandingCTASection from '../../components/landing/cta/LandingCTASection';
import LandingFeaturesSection from '../../components/landing/features/LandingFeaturesSection';
import LandingHeroSection from '../../components/landing/LandingHeroSection';
import LandingHowItWorksSection from '../../components/landing/how-it-works/LandingHowItWorksSection';
import LandingSeeItInActionSection from '../../components/landing/see-it-in-action/LandingSeeItInActionSection';
import LandingStatsSection from '../../components/landing/LandingStatsSection';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import './LandingPage.css';

export default function LandingPage() {
  const howItWorks = useScrollAnimation({ animateOnMount: true });
  const seeItInAction = useScrollAnimation();
  const features = useScrollAnimation();
  const cta = useScrollAnimation();

  return (
    <Box sx={{ overflowX: 'clip' }}>
      <Helmet>
        <title>Squares – NFL Football Squares Pools</title>
        <meta
          name="description"
          content="Create and join NFL football squares pools. Claim squares, track live scores, and compete with friends in real-time."
        />
        <link rel="canonical" href="https://squares.maxstash.io/" />
      </Helmet>
      <LandingHeroSection />
      <LandingHowItWorksSection animRef={howItWorks.ref} isVisible={howItWorks.isVisible} />
      <LandingSeeItInActionSection
        animRef={seeItInAction.ref}
        isVisible={seeItInAction.isVisible}
      />
      <LandingFeaturesSection animRef={features.ref} isVisible={features.isVisible} />
      <LandingStatsSection />
      <LandingCTASection animRef={cta.ref} isVisible={cta.isVisible} />
    </Box>
  );
}
