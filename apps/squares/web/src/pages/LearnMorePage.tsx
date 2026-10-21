import { DeviceHub, People, Security, Sports, Timeline, Tune } from '@mui/icons-material';
import { Box, Container, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import LearnFAQs from '../features/learn/components/LearnFAQs';
import LearnFeatureCard from '../features/learn/components/LearnFeatureCard';
import LearnHowItWorksCard from '../features/learn/components/LearnHowItWorksCard';
import Reveal from '../components/Reveal';

export default function LearnMorePage() {
  const howItWorksSteps = [
    {
      stepNumber: 1,
      title: 'Create the Grid',
      description:
        'Set up a 10x10 grid with 100 squares. Each square represents a potential winning combination.',
    },
    {
      stepNumber: 2,
      title: 'Players Choose Squares',
      description:
        'Participants select their squares by clicking on the grid. Each square can only be claimed once.',
    },
    {
      stepNumber: 3,
      title: 'Determine Winners',
      description:
        "Winners are determined by the last digit of each team's score at the end of each quarter.",
    },
  ];

  const featuresList = [
    {
      icon: <Sports />,
      title: 'Squares Made Easy',
      description:
        'Create and manage squares games with just a few clicks. Perfect for Super Bowl parties, playoff games, or any sports event.',
    },
    {
      icon: <People />,
      title: 'Social & Collaborative',
      description:
        'Share your contests with friends and family. Players can join with a simple link - all participants need accounts to join.',
    },
    {
      icon: <Timeline />,
      title: 'Real-time Updates',
      description:
        'See changes instantly as players fill out squares. Live synchronization ensures everyone sees the latest game state.',
    },
    {
      icon: <Security />,
      title: 'Secure & Reliable',
      description:
        'Your contests are protected with modern security practices. Data is encrypted and safely stored in the cloud.',
    },
    {
      icon: <DeviceHub />,
      title: 'Cross-Platform',
      description:
        'Works seamlessly on desktop, tablet, and mobile devices. Responsive design ensures a great experience everywhere.',
    },
    {
      icon: <Tune />,
      title: 'Your Pool, Your Rules',
      description:
        'Make a contest private or public, set how many squares each player can claim, and limit invite links by uses or time.',
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
        'Click "Create Contest", pick one of the upcoming NFL games, and give it a short name. Then set the contest to private or public, pick how many squares you want to claim, and invite others to fill out the rest of the grid.',
    },
    {
      question: 'Where do the scores come from?',
      answer:
        'Every contest is linked to a live NFL game. The score updates on its own as the game is played, the board locks and the numbers are drawn at kickoff, and each quarter winner is calculated for you the moment the quarter ends.',
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
        "Winners are decided by the last digit of each team's score at the end of each quarter. For example, if the score is Home 14, Away 7, the winning square sits where row 4 meets column 7. The app calculates this automatically from the live score.",
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
        'Use the Contact page to send us a message, or email support@maxhq.io directly. We typically respond within a week.',
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
        <link rel="canonical" href="https://squares.maxhq.io/learn-more" />
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
      {/* header */}
      <Container maxWidth="lg" sx={{ pt: { xs: 7, md: 11 }, pb: { xs: 6, md: 9 } }}>
        <Reveal>
          <Typography variant="h1" sx={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}>
            Learn More
          </Typography>
        </Reveal>
        <Reveal delay={100}>
          <Typography
            sx={{
              mt: 2.5,
              maxWidth: '58ch',
              color: 'text.secondary',
              fontSize: '1.15rem',
              lineHeight: 1.65,
            }}
          >
            Discover everything you need to know about creating and managing squares games. From
            basic concepts to advanced features, we&apos;ve got you covered.
          </Typography>
        </Reveal>
      </Container>

      {/* how it works */}
      <Box
        component="section"
        sx={{
          py: { xs: 6, md: 9 },
          borderTop: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="lg">
          <Reveal>
            <Typography
              variant="h2"
              sx={{ fontSize: 'clamp(2.2rem, 4.4vw, 3.2rem)', mb: { xs: 4, md: 6 } }}
            >
              How Squares Work
            </Typography>
          </Reveal>
          <Box
            component="ol"
            sx={{
              m: 0,
              p: 0,
              listStyle: 'none',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: { xs: 2, md: 3 },
            }}
          >
            {howItWorksSteps.map((step, index) => (
              <Reveal
                key={step.stepNumber}
                component="li"
                delay={index * 100}
                sx={{ height: '100%' }}
              >
                <LearnHowItWorksCard
                  stepNumber={step.stepNumber}
                  title={step.title}
                  description={step.description}
                  final={index === howItWorksSteps.length - 1}
                />
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      {/* platform features */}
      <Box component="section" sx={{ py: { xs: 6, md: 9 } }}>
        <Container maxWidth="lg">
          <Reveal>
            <Typography
              variant="h2"
              sx={{ fontSize: 'clamp(2.2rem, 4.4vw, 3.2rem)', mb: { xs: 3, md: 5 } }}
            >
              Platform Features
            </Typography>
          </Reveal>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              columnGap: 6,
            }}
          >
            {featuresList.map((feature, index) => (
              <Reveal key={feature.title} delay={(index % 2) * 80}>
                <LearnFeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      {/* faqs */}
      <Box
        component="section"
        sx={{
          py: { xs: 6, md: 9 },
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            display: 'grid',
            gridTemplateColumns: { md: 'minmax(0, 0.7fr) minmax(0, 1.3fr)' },
            gap: { xs: 3, md: 8 },
            alignItems: 'start',
          }}
        >
          <Reveal sx={{ position: { md: 'sticky' }, top: { md: 96 } }}>
            <Typography variant="h2" sx={{ fontSize: 'clamp(2.2rem, 4.4vw, 3.2rem)' }}>
              Frequently Asked Questions
            </Typography>
          </Reveal>
          <Box>
            {faqs.map((faq) => (
              <LearnFAQs key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </Box>
        </Container>
      </Box>
    </>
  );
}
