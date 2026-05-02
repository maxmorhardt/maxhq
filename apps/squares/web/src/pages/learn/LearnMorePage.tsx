import { DeviceHub, People, Security, Sports, Timeline, Tune } from '@mui/icons-material';
import { Box, Container, Typography } from '@mui/material';
import LearnFAQs from '../../components/learn/LearnFAQs';
import LearnFeatureCard from '../../components/learn/LearnFeatureCard';
import LearnHowItWorksCard from '../../components/learn/LearnHowItWorksCard';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import '../landing/LandingPage.css';

// learn more page with how it works, features, and faqs
export default function LearnMorePage() {
  const header = useScrollAnimation();
  const howItWorks = useScrollAnimation();
  const features = useScrollAnimation();
  const faqsAnim = useScrollAnimation();

  const howItWorksSteps = [
    {
      stepNumber: 1,
      title: 'Create the Grid',
      description:
        'Set up a 10x10 grid with 100 squares. Each square represents a potential winning combination.',
      color: '#ffa040',
    },
    {
      stepNumber: 2,
      title: 'Players Choose Squares',
      description:
        'Participants select their squares by clicking on the grid. Each square can only be claimed once.',
      color: '#40d4ff',
    },
    {
      stepNumber: 3,
      title: 'Determine Winners',
      description:
        "Winners are determined by the last digit of each team's score at the end of each quarter.",
      color: '#4ade80',
    },
  ];

  const featuresList = [
    {
      icon: <Sports sx={{ color: '#667eea' }} />,
      title: 'Squares Made Easy',
      description:
        'Create and manage squares games with just a few clicks. Perfect for Super Bowl parties, playoff games, or any sports event.',
    },
    {
      icon: <People sx={{ color: '#f093fb' }} />,
      title: 'Social & Collaborative',
      description:
        'Share your contests with friends and family. Players can join with a simple link - all participants need accounts to join.',
    },
    {
      icon: <Timeline sx={{ color: '#43e97b' }} />,
      title: 'Real-time Updates',
      description:
        'See changes instantly as players fill out squares. Live synchronization ensures everyone sees the latest game state.',
    },
    {
      icon: <Security sx={{ color: '#4facfe' }} />,
      title: 'Secure & Reliable',
      description:
        'Your contests are protected with modern security practices. Data is encrypted and safely stored in the cloud.',
    },
    {
      icon: <DeviceHub sx={{ color: '#ff9a8b' }} />,
      title: 'Cross-Platform',
      description:
        'Works seamlessly on desktop, tablet, and mobile devices. Responsive design ensures a great experience everywhere.',
    },
    {
      icon: <Tune sx={{ color: '#a78bfa' }} />,
      title: 'Customizable',
      description:
        'Personalize your contests with custom team names, scoring rules, and payout structures to fit your specific event needs.',
    },
  ];

  const faqs = [
    {
      question: 'What is Squares?',
      answer:
        "Squares (also called Super Bowl squares) is a popular betting pool game. Players buy squares in a 10x10 grid, and winners are determined based on the last digit of each team's score at the end of each quarter.",
    },
    {
      question: 'How do I create a contest?',
      answer:
        'Simply click "Create Contest" on the home page, give your contest a name, optionally set team names, and share the link with your friends. They can then select their squares.',
    },
    {
      question: 'Do players need accounts?',
      answer:
        'Yes, all participants need accounts to join and select squares. Both contest creators and participants must sign up to participate.',
    },
    {
      question: 'How are winners determined?',
      answer:
        "Winners are typically determined by the last digit of each team's score. For example, if the score is Home: 14, Away: 7, the winning square would be at coordinates (4,7). You can customize the winning criteria for your contest.",
    },
    {
      question: 'Is it free to use?',
      answer:
        'Yes! Creating and managing contests is completely free. There are no hidden fees or premium tiers - enjoy unlimited contests at no cost.',
    },
    {
      question: 'Can I use this for other sports?',
      answer:
        'While designed for football, the platform can be adapted for any sport with scoring. The grid system works well for basketball, hockey, or any game with numerical scores.',
    },
  ];

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box
          ref={header.ref}
          className={`scroll-section ${header.isVisible ? 'visible' : ''}`}
          sx={{ textAlign: 'center' }}
        >
          <Typography
            variant="h2"
            className="reveal"
            sx={{ fontWeight: 700, mb: 3, color: 'white' }}
          >
            Learn More
          </Typography>
          <Typography
            variant="h6"
            className="reveal delay-1"
            sx={{
              color: 'rgba(255,255,255,0.7)',
              maxWidth: 800,
              mx: 'auto',
              fontWeight: 400,
              lineHeight: 1.7,
            }}
          >
            Discover everything you need to know about creating and managing squares games. From
            basic concepts to advanced features, we&apos;ve got you covered.
          </Typography>
        </Box>
      </Container>

      {/* ── How It Works ────────────────────────────────────────────── */}
      <Box
        sx={{
          background: 'rgba(255,255,255,0.03)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Box
            ref={howItWorks.ref}
            className={`scroll-section ${howItWorks.isVisible ? 'visible' : ''}`}
          >
            <Typography
              variant="h3"
              className="reveal"
              sx={{ color: 'white', fontWeight: 700, textAlign: 'center', mb: 6 }}
            >
              How Squares Work
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
                gap: 4,
              }}
            >
              {howItWorksSteps.map((step, index) => (
                <Box key={step.stepNumber} className={`reveal delay-${index + 1}`}>
                  <LearnHowItWorksCard
                    stepNumber={step.stepNumber}
                    title={step.title}
                    description={step.description}
                    color={step.color}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ── Platform Features ──────────────────────────────────────── */}
      <Box
        sx={{
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Box
            ref={features.ref}
            className={`scroll-section ${features.isVisible ? 'visible' : ''}`}
          >
            <Typography
              variant="h3"
              className="reveal"
              sx={{ color: 'white', fontWeight: 700, textAlign: 'center', mb: 6 }}
            >
              Platform Features
            </Typography>
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}
            >
              {featuresList.map((feature, index) => (
                <Box
                  key={feature.title}
                  className={`reveal delay-${index + 1}`}
                  sx={{ height: '100%' }}
                >
                  <LearnFeatureCard
                    icon={feature.icon}
                    title={feature.title}
                    description={feature.description}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ── FAQs ───────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: 'rgba(255,255,255,0.03)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Box
            ref={faqsAnim.ref}
            className={`scroll-section ${faqsAnim.isVisible ? 'visible' : ''}`}
          >
            <Typography
              variant="h3"
              className="reveal"
              sx={{ color: 'white', fontWeight: 700, textAlign: 'center', mb: 6 }}
            >
              Frequently Asked Questions
            </Typography>
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
              {faqs.map((faq, index) => (
                <Box
                  key={index}
                  sx={{ mb: 2 }}
                  className={`reveal delay-${Math.min(index + 1, 7)}`}
                >
                  <LearnFAQs question={faq.question} answer={faq.answer} />
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}
