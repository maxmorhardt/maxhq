import { EmojiEvents, GridOn, Groups, Shuffle } from '@mui/icons-material';
import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LandingExampleCard from '../../components/landing/LandingExampleCard';
import LandingFeatureCard from '../../components/landing/LandingFeatureCard';
import LandingCreateContestButton from '../../components/landing/LandingCreateContestButton';
import LandingHowItWorksCard from '../../components/landing/LandingHowItWorksCard';
import LandingSectionContainer from '../../components/landing/LandingSectionContainer';
import { gradients } from '../../types/gradients';

type GradientType = 'primary' | 'pink' | 'cyan' | 'mint' | 'secondary' | 'lightBlue' | 'black';

interface Feature {
  emoji: string;
  gradient: GradientType;
  title: string;
  description: string;
}

const howItWorksSteps = [
  {
    icon: GridOn,
    title: 'Fill Out the Squares',
    description:
      'Participants choose and fill out squares on a 10x10 contest grid. Each square represents a potential score combination.',
    backgroundColor: 'primary.main',
  },
  {
    icon: Shuffle,
    title: 'Randomize Numbers',
    description:
      'Once all squares are filled, randomly assign numbers 0-9 to both the X and Y axis representing each team.',
    backgroundColor: 'secondary.main',
  },
  {
    icon: EmojiEvents,
    title: 'Determine Winners',
    description:
      "At the end of each quarter, take the last digit of both teams' scores to find the winning square.",
    backgroundColor: 'success.main',
  },
  {
    icon: Groups,
    title: 'Share & Collaborate',
    description:
      'Share your contest with friends and family. Everyone can see real-time updates as squares are filled.',
    backgroundColor: 'info.main',
  },
];

const features: Feature[] = [
  {
    emoji: '⚡',
    gradient: 'primary',
    title: 'Real-time Updates',
    description: 'See changes instantly as players fill out squares with live synchronization',
  },
  {
    emoji: '🔗',
    gradient: 'pink',
    title: 'Easy Sharing',
    description: 'Share contests with a simple link - all participants need accounts to join',
  },
  {
    emoji: '📱',
    gradient: 'cyan',
    title: 'Mobile Friendly',
    description: 'Works perfectly on phones, tablets, and computers with responsive design',
  },
  {
    emoji: '🆓',
    gradient: 'mint',
    title: 'Free to Use',
    description: 'Create unlimited contests for all your gatherings at no cost',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <>
      {/* hero */}
      <Box
        sx={{
          background: gradients.lightBlue,
          py: { xs: 10, md: 16 },
          mb: 14,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', position: 'relative' }}>
            <Typography
              variant="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                mb: 4,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              Squares
            </Typography>

            <Typography
              variant="h4"
              sx={{
                mb: 4,
                fontWeight: 300,
                maxWidth: 700,
                mx: 'auto',
                opacity: 0.95,
                fontSize: { xs: '1.2rem', md: '1.5rem' },
                lineHeight: 1.4,
              }}
            >
              The ultimate football squares game for any gathering. Create contests, fill squares,
              and win big during the big game!
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'nowrap' }}>
              <LandingCreateContestButton />
              <Button
                variant="outlined"
                size="large"
                sx={{
                  px: { xs: 2, sm: 4 },
                  py: { xs: 1, sm: 2 },
                  fontSize: { xs: '.8rem', sm: '1.2rem' },
                  fontWeight: 500,
                  color: 'text.primary',
                }}
                onClick={() => navigate('/learn-more')}
              >
                Learn More
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* how it works */}
      <Container maxWidth="lg" sx={{ mb: 14 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: 'text.primary',
            }}
          >
            How It Works
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              mb: 6,
              maxWidth: 600,
              mx: 'auto',
              fontWeight: 400,
            }}
          >
            Get your squares game running in 4 simple steps
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: { xs: 2, sm: 2, md: 3 },
            }}
          >
            {howItWorksSteps.map((step, index) => (
              <LandingHowItWorksCard
                key={index}
                icon={step.icon}
                title={step.title}
                description={step.description}
                backgroundColor={step.backgroundColor}
              />
            ))}
          </Box>
        </Box>
      </Container>

      {/* see it in action */}
      <LandingSectionContainer variant="lightBlue">
        <Typography
          variant="h3"
          gutterBottom
          sx={{
            textAlign: 'center',
            mb: 2,
            fontWeight: 700,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          See It In Action
        </Typography>

        <Typography
          variant="h6"
          sx={{
            textAlign: 'center',
            mb: 6,
            maxWidth: 600,
            mx: 'auto',
            fontWeight: 400,
            opacity: 0.9,
          }}
        >
          Here's how winners are determined each quarter
        </Typography>

        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 4,
              mb: 4,
            }}
          >
            <LandingExampleCard title="🏈 Game Situation">
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                End of 1st Quarter
              </Typography>
            </LandingExampleCard>

            <LandingExampleCard title="📊 Current Score">
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Home Team <strong>14</strong> - Away Team <strong>7</strong>
              </Typography>
            </LandingExampleCard>
          </Box>

          <LandingExampleCard title="🎯 Winning Square" isCentered>
            <Typography variant="body1" sx={{ mb: 2, color: 'rgba(255,255,255,0.8)' }}>
              Last digits: <strong>4</strong> (Home) × <strong>7</strong> (Away)
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: 'gold',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              Square (4,7) Wins! 🏆
            </Typography>
          </LandingExampleCard>
        </Box>
      </LandingSectionContainer>

      {/* features */}
      <LandingSectionContainer variant="black">
        <Typography
          variant="h3"
          component="h2"
          gutterBottom
          sx={{
            textAlign: 'center',
            mb: 2,
            fontWeight: 700,
            color: 'white',
            background: gradients.textGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Why Choose Our Platform?
        </Typography>

        <Typography
          variant="h6"
          sx={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.8)',
            mb: 6,
            maxWidth: 600,
            mx: 'auto',
            fontWeight: 400,
          }}
        >
          Built for simplicity, designed for everyone
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' },
            gap: 4,
          }}
        >
          {features.map((feature, index) => (
            <LandingFeatureCard
              key={index}
              emoji={feature.emoji}
              gradient={feature.gradient}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </Box>
      </LandingSectionContainer>

      {/* call to action */}
      <LandingSectionContainer variant="lightBlue">
        <Typography
          variant="h3"
          gutterBottom
          sx={{
            fontWeight: 700,
            color: 'white',
            mb: 2,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          Ready to Get Started?
        </Typography>

        <Typography
          variant="h6"
          sx={{
            mb: 4,
            color: 'rgba(255,255,255,0.8)',
            maxWidth: 500,
            mx: 'auto',
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          Create your first contest in seconds and share it with your friends and family for an
          unforgettable game experience.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <LandingCreateContestButton />
        </Box>

        <Box
          sx={{
            mt: 4,
            display: 'flex',
            justifyContent: 'center',
            gap: 4,
            flexWrap: 'wrap',
            color: 'white',
            opacity: 0.95,
          }}
        >
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            ✅ No credit card required
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            ✅ Setup in under 2 minutes
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            ✅ Works on all devices
          </Typography>
        </Box>
      </LandingSectionContainer>
    </>
  );
}
