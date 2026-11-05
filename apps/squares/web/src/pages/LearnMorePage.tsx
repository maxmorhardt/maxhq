import { DeviceHub, MoneyOff, People, Sports, Timeline, Tune } from '@mui/icons-material';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router';
import CreateContestButton from '../features/contests/components/CreateContestButton';
import StartBoardCallout from '../features/contests/components/StartBoardCallout';
import LearnFAQs from '../features/learn/components/LearnFAQs';
import LearnFeatureCard from '../features/learn/components/LearnFeatureCard';
import LearnHowItWorksCard from '../features/learn/components/LearnHowItWorksCard';
import Reveal from '../components/Reveal';

export default function LearnMorePage() {
  const howItWorksSteps = [
    {
      stepNumber: 1,
      title: 'Set up the board',
      description:
        "Pick an upcoming NFL game and create a 10x10 board. One team's score runs across the top and the other's down the side.",
    },
    {
      stepNumber: 2,
      title: 'Friends claim squares',
      description:
        'Share one invite link. Everyone signs in from their phone, you give each person their squares, and they claim them.',
    },
    {
      stepNumber: 3,
      title: 'Numbers are drawn at kickoff',
      description:
        'When the game starts, the board locks and every row and column gets a random digit from 0 to 9.',
    },
    {
      stepNumber: 4,
      title: 'The score picks each square',
      description:
        "At the end of every quarter, the last digit of each team's score points to one square, and Squares highlights it for everyone.",
    },
  ];

  const featuresList = [
    {
      icon: <DeviceHub />,
      title: 'Nothing to install',
      description:
        'Everyone plays in the browser on their phone, tablet, or computer. There is no app to download.',
    },
    {
      icon: <Timeline />,
      title: 'Live scores, called for you',
      description:
        "Every board follows a real NFL game. Each quarter's square lights up the moment the quarter ends, with no score checking or spreadsheets.",
    },
    {
      icon: <People />,
      title: 'One link to invite everyone',
      description:
        'Drop a single invite link in the group chat. Anyone who joins can follow along, and you decide who gets squares.',
    },
    {
      icon: <Tune />,
      title: 'Your board, your rules',
      description:
        'Make a board private or public, and set how many squares each player can claim.',
    },
    {
      icon: <Sports />,
      title: 'Made for game day',
      description:
        'Super Bowl parties, Thanksgiving games, office get-togethers, or any NFL Sunday with friends and family.',
    },
    {
      icon: <MoneyOff />,
      title: 'Free, with no money involved',
      description:
        'Squares is free and just for fun. It never asks for a payment, and there are no entry fees or prizes.',
    },
  ];

  const faqs = [
    {
      question: 'What is football squares?',
      answer:
        "Football squares, often called Super Bowl squares, is a classic game-day game. Players claim squares on a 10x10 grid, and at the end of every quarter the last digit of each team's score picks one square. Squares runs the whole board for you online.",
    },
    {
      question: 'Does Squares involve money or prizes?',
      answer:
        'No. Squares is free to play and just for fun. The app never asks for or handles payments, and there are no entry fees, buy-ins, or prizes. You can run as many boards as you like at no cost.',
    },
    {
      question: 'How do I create a contest?',
      answer:
        'Click "Create a Contest" and sign in with Google, Microsoft, or GitHub. Pick one of the upcoming NFL games, give the board a short name, choose private or public, set how many squares you want to claim, and share the invite link.',
    },
    {
      question: 'Can I use it for Super Bowl squares?',
      answer:
        'Yes. When the game is on the schedule, create a board for it the same way as any other game and share the link with your party.',
    },
    {
      question: 'How is each quarter decided?',
      answer:
        "By the last digit of each team's score at the end of the quarter. For example, if the score is Home 14, Away 7, the highlighted square sits where the home team's 4 column meets the away team's 7 row. Squares works this out from the live score automatically.",
    },
    {
      question: 'Where do the scores come from?',
      answer:
        'Every contest is linked to a live NFL game. The score updates on its own as the game is played, the board locks and the numbers are drawn at kickoff, and each quarter is decided the moment it ends.',
    },
    {
      question: 'How do I invite people to my contest?',
      answer:
        'Open your contest and select "Invite" to share or copy its invite link. Anyone who opens it can sign in and join with no squares, then you give them squares. If the link ends up somewhere it shouldn\'t, reset it and the old one stops working.',
    },
    {
      question: 'How do I manage players and their squares?',
      answer:
        'As the owner, open the "Players" panel before kickoff to set how many squares each person can claim, or give everyone without squares the same number at once. The board never gives out more than 100. Lowering someone below what they hold frees that many of their squares at random. Removing someone frees their squares and bans them from rejoining until you unban them in the same panel.',
    },
    {
      question: "What's the difference between a private and public contest?",
      answer:
        "A private contest is invite-only and hidden from anyone who isn't part of it. A public contest can be viewed by anyone with the link, but only people who join with your invite link can claim squares.",
    },
    {
      question: 'Do I need an account, and how do I sign in?',
      answer:
        "Yes, everyone needs an account to join a contest and claim squares. You sign in with your Google, Microsoft, or GitHub account, so there's no separate password to remember, and signing in with the same email always brings you back to the same account.",
    },
    {
      question: 'How do I change my square initials?',
      answer:
        'Go to your Profile and edit your Default Initials, up to three letters or numbers. They appear on every square you claim, and updating them refreshes your squares in any active contests automatically.',
    },
    {
      question: 'How do I leave a contest?',
      answer:
        'Open the contest\'s "Players" panel and use the leave option next to your name, or use the leave action in the "Joined Contests" table on your Contests page. Owners can\'t leave their own contest and would delete it instead. Leaving frees up any squares you had claimed.',
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
  ];

  return (
    <>
      <Helmet>
        <title>How to Play Football Squares – Squares</title>
        <meta
          name="description"
          content="Learn how to play football squares: set up a 10x10 board, share one link, and the live NFL score picks each quarter's square. Free to play, with no money involved."
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
          <Typography variant="h1" sx={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', maxWidth: '14ch' }}>
            How to Play Football Squares
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
            Football squares is a classic game-day game for watching NFL games with friends. Here is
            how it works, and how to run your own board on Squares in a couple of minutes.
          </Typography>
        </Reveal>
        <Reveal delay={200} sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <CreateContestButton />
          <Button component={Link} to="/games" variant="outlined" color="inherit" size="large">
            See This Week&apos;s Games
          </Button>
        </Reveal>
        <Reveal delay={300}>
          <Paper
            variant="outlined"
            sx={{
              mt: 4,
              p: 2.5,
              maxWidth: 640,
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              borderRadius: '14px',
            }}
          >
            <MoneyOff sx={{ color: 'primary.main', mt: '2px' }} />
            <Typography sx={{ color: 'text.secondary' }}>
              <Box component="strong" sx={{ color: 'text.primary' }}>
                Free to play, just for fun.
              </Box>{' '}
              Squares never asks for or handles money. There are no entry fees, payments, or prizes.
            </Typography>
          </Paper>
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
              How Football Squares Works
            </Typography>
          </Reveal>
          <Box
            component="ol"
            sx={{
              m: 0,
              p: 0,
              listStyle: 'none',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
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

      {/* why squares */}
      <Box component="section" sx={{ py: { xs: 6, md: 9 } }}>
        <Container maxWidth="lg">
          <Reveal>
            <Typography
              variant="h2"
              sx={{ fontSize: 'clamp(2.2rem, 4.4vw, 3.2rem)', mb: { xs: 3, md: 5 } }}
            >
              Why Run Your Board on Squares
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

      {/* the next step once the questions are answered */}
      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 9 } }}>
        <StartBoardCallout
          message="Ready to play? Set up a free board in a couple of minutes."
          signedInMessage="Ready for the next game? Start a new board in a couple of minutes."
          sx={{ mt: { xs: 5, md: 7 } }}
        />
      </Container>
    </>
  );
}
