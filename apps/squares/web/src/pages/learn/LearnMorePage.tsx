import { DeviceHub, People, Security, Sports, Timeline, Tune } from '@mui/icons-material';
import { Box, Container, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import LearnFAQs from '../../components/learn/LearnFAQs';
import LearnFeatureCard from '../../components/learn/LearnFeatureCard';
import LearnHowItWorksCard from '../../components/learn/LearnHowItWorksCard';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import '../landing/LandingPage.css';

export default function LearnMorePage() {
  const header = useScrollAnimation();
  const howItWorks = useScrollAnimation({ animateOnMount: true });
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
        "Squares (also called Super Bowl squares) is a popular pool game. Players claim squares in a 10x10 grid, and winners are decided by the last digit of each team's score at the end of every quarter.",
    },
    {
      question: 'How do I create a contest?',
      answer:
        'Click "Create Contest", give it a short name, and choose a matchup by linking a live NFL game or entering the teams yourself. Then set the contest to private or public, pick how many squares you want to claim, and invite others to fill out the rest of the grid.',
    },
    {
      question: "What's the difference between a live game and manual scoring?",
      answer:
        "When you link a live NFL game, the teams and scores update automatically as it plays out and quarter winners are calculated for you. With manual scoring you enter the team names and record the score yourself at the end of each quarter, which is handy for college, local, or other games that aren't in our schedule.",
    },
    {
      question: 'How do I invite people to my contest?',
      answer:
        'Open your contest and select "Invite Links". Pick a role (participant or viewer) and, for participants, how many squares each person can claim. You can optionally limit how many times a link is used and set it to expire after a number of minutes. Generate the link, share it, and anyone who opens it can sign in and join.',
    },
    {
      question: 'How do I manage participants and their roles?',
      answer:
        'Participants can claim squares up to their per-person limit, while viewers follow along in real time without claiming any. As the owner, open the "Participants" panel while the contest is active to change someone\'s role, adjust how many squares they can claim, or remove them. Removing a participant clears their claimed squares so others can take them.',
    },
    {
      question: "What's the difference between a private and public contest?",
      answer:
        "A private contest is invite-only and hidden from anyone who isn't part of it. A public contest can be viewed by anyone with the link, but only people you've invited can actually claim squares.",
    },
    {
      question: 'How do I change my square initials?',
      answer:
        'Go to your Profile and edit your Default Initials, up to three letters or numbers. They appear on every square you claim, and updating them refreshes your squares in any active contests automatically.',
    },
    {
      question: 'Do I need an account, and how do I sign in?',
      answer:
        "Yes, everyone needs an account to join a contest and claim squares. You sign in with your Google or GitHub account, so there's no separate password to remember. Your email is your identity across the platform, so signing in with the same email always brings you back to the same account and history.",
    },
    {
      question: 'How are winners determined?',
      answer:
        "Winners are decided by the last digit of each team's score at the end of each quarter. For example, if the score is Home 14, Away 7, the winning square sits where row 4 meets column 7. Live games calculate this automatically, and manual contests use the scores you enter.",
    },
    {
      question: 'How do I leave a contest?',
      answer:
        'Open the contest\'s "Participants" panel and use the leave option next to your name, or use the leave action in the "Joined Contests" table on your Contests page. Owners can\'t leave their own contest and would delete it instead. Leaving frees up any squares you had claimed.',
    },
    {
      question: 'How do I delete my account?',
      answer:
        "Go to your Profile and open the Danger Zone at the bottom. You'll need to delete or leave any active contests first. Deleting anonymizes your past contest history and removes your personal data, and it cannot be undone.",
    },
    {
      question: 'How do I contact support?',
      answer:
        'Use the Contact page to send us a message, or email support@maxstash.io directly. We typically respond within a week.',
    },
    {
      question: 'Is it free to use?',
      answer:
        'Yes. Creating and managing contests is completely free, with no hidden fees or premium tiers, so you can run unlimited contests at no cost.',
    },
  ];

  return (
    <>
      <Helmet>
        <title>How to Play Football Squares – Squares</title>
        <meta
          name="description"
          content="Learn how NFL football squares pools work. Create a grid, claim squares, and win based on live game scores."
        />
        <link rel="canonical" href="https://squares.maxstash.io/learn-more" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          })}
        </script>
      </Helmet>
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
            sx={{
              fontWeight: 700,
              mb: 3,
              color: 'white',
              fontSize: { xs: '2.8rem', sm: '3.5rem', md: '4rem' },
            }}
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
                gap: { xs: 4, md: 3, lg: 4 },
              }}
            >
              {howItWorksSteps.map((step, index) => (
                <Box
                  key={step.stepNumber}
                  className={`reveal delay-${index + 1}`}
                  sx={{ height: '100%' }}
                >
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
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gridAutoRows: '1fr',
                gap: 4,
              }}
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
                  className="reveal"
                  style={{ transitionDelay: `${index * 0.08}s` }}
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
