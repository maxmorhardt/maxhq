import LandingHero from '../../components/landing/LandingHero';
import LandingHowItWorks from '../../components/landing/LandingHowItWorks';
import LandingExample from '../../components/landing/LandingExample';
import LandingFeatures from '../../components/landing/LandingFeatures';
import LandingCallToAction from '../../components/landing/LandingCallToAction';

export default function LandingPage() {
  return (
    <>
      <LandingHero />
      <LandingHowItWorks />
      <LandingExample />
      <LandingFeatures />
      <LandingCallToAction />
    </>
  );
}
