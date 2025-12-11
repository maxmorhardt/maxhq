import {
  AttachMoney,
  Bolt,
  EmojiEvents,
  GridOn,
  Groups,
  Link,
  PhoneAndroid,
  Shuffle,
} from '@mui/icons-material';
import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingCreateContestButton from '../../components/landing/LandingCreateContestButton';
import LandingCTABadge from '../../components/landing/LandingCTABadge';
import LandingFeatureCard from '../../components/landing/LandingFeatureCard';
import LandingHowItWorksCard from '../../components/landing/LandingHowItWorksCard';
import LandingStepCard from '../../components/landing/LandingStepCard';
import { gradients } from '../../types/gradients';
import './LandingPage.css';

type GradientType =
  | 'primary'
  | 'pink'
  | 'cyan'
  | 'mint'
  | 'secondary'
  | 'lightBlue'
  | 'black'
  | 'green';

interface Feature {
  emoji?: string;
  icon?: ReactNode;
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
    icon: <Bolt sx={{ fontSize: 'inherit' }} />,
    gradient: 'cyan',
    title: 'Real-time Updates',
    description: 'See changes instantly as players fill out squares with live synchronization',
  },
  {
    icon: <Link sx={{ fontSize: 'inherit' }} />,
    gradient: 'primary',
    title: 'Easy Sharing',
    description: 'Share contests with a simple link - all participants need accounts to join',
  },
  {
    icon: <PhoneAndroid sx={{ fontSize: 'inherit' }} />,
    gradient: 'mint',
    title: 'Mobile Friendly',
    description: 'Works perfectly on phones, tablets, and computers with responsive design',
  },
  {
    icon: <AttachMoney sx={{ fontSize: 'inherit' }} />,
    gradient: 'green',
    title: 'Free to Use',
    description: 'Create unlimited contests for all your gatherings at no cost',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const theme = useTheme();

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
                  fontSize: { xs: '1rem', sm: '1.2rem' },
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
      <Container maxWidth="lg" sx={{ mb: 14 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: 'text.primary',
            }}
          >
            See It In Action
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
              fontWeight: 400,
            }}
          >
            Here's how winners are determined each quarter
          </Typography>
        </Box>

        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
          <LandingStepCard
            step={1}
            title="🏈 Game Reaches End of Quarter"
            gradient="linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)"
            gradientLight="linear-gradient(135deg, rgba(255, 107, 107, 0.05) 0%, rgba(255, 142, 83, 0.05) 100%)"
            borderColor="#FF6B6B"
            shadowColor="rgba(255, 107, 107, 0.12)"
          >
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                lineHeight: 1.7,
              }}
            >
              As the quarter ends, check the current score. For this example, it's the{' '}
              <strong>end of the 1st Quarter</strong>.
            </Typography>
          </LandingStepCard>

          <LandingStepCard
            step={2}
            title="📊 Look at the Final Score"
            gradient="linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)"
            gradientLight="linear-gradient(135deg, rgba(79, 172, 254, 0.05) 0%, rgba(0, 242, 254, 0.05) 100%)"
            borderColor="#4FACFE"
            shadowColor="rgba(79, 172, 254, 0.12)"
          >
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                lineHeight: 1.7,
              }}
            >
              The scoreboard shows <strong>Home Team: 14</strong> and <strong>Away Team: 7</strong>.
              These numbers determine the winning square.
            </Typography>
          </LandingStepCard>

          <LandingStepCard
            step={3}
            title="🎯 Determine the Winner"
            gradient="linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)"
            gradientLight="linear-gradient(135deg, rgba(67, 233, 123, 0.05) 0%, rgba(56, 249, 215, 0.05) 100%)"
            borderColor="#43E97B"
            shadowColor="rgba(67, 233, 123, 0.12)"
          >
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                lineHeight: 1.7,
                mb: { xs: 2, md: 3 },
              }}
            >
              Take the <strong>last digit</strong> of each score:
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1, md: 2 },
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                mb: { xs: 2, md: 3 },
                p: { xs: 2, md: 4 },
                background: theme.palette.grey[900],
                borderRadius: { xs: 2, md: 3 },
                border: '2px solid rgba(76, 175, 80, 0.3)',
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#64B5F6',
                  fontSize: { xs: '1.5rem', md: '2.125rem' },
                }}
              >
                <span
                  style={{
                    fontSize: 'clamp(1rem, 3vw, 1.5rem)',
                    color: 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  1
                </span>
                4
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                ×
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#64B5F6',
                  fontSize: { xs: '1.5rem', md: '2.125rem' },
                }}
              >
                <span
                  style={{
                    fontSize: 'clamp(1rem, 3vw, 1.5rem)',
                    color: 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  0
                </span>
                7
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  mx: { xs: 0.5, md: 1 },
                  fontWeight: 600,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                =
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  color: '#66BB6A',
                  px: { xs: 2, md: 3 },
                  py: { xs: 0.5, md: 1 },
                  borderRadius: 2,
                  background: 'rgba(102, 187, 106, 0.2)',
                  border: '2px solid #66BB6A',
                  fontSize: { xs: '1.5rem', md: '2.125rem' },
                }}
              >
                (4, 7)
              </Typography>
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'success.main',
                textAlign: 'center',
                mt: { xs: 1.5, md: 2 },
                fontSize: { xs: '1rem', md: '1.25rem' },
              }}
            >
              Square (4, 7) Wins This Quarter! 🏆
            </Typography>
          </LandingStepCard>
        </Box>
      </Container>

      {/* features */}
      <Container maxWidth="lg" sx={{ pb: 14 }}>
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 4,
            background: theme.palette.grey[900],
            borderRadius: 4,
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
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
                icon={feature.icon}
                gradient={feature.gradient}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </Box>
        </Box>
      </Container>

      {/* call to action */}
      <Box
        sx={{
          position: 'relative',
          py: { xs: 12, md: 16 },
          overflow: 'hidden',
        }}
      >
        <div className="cta-animated-bg">
          <div className="mesh-gradient-blob"></div>
          <div className="mesh-gradient-blob"></div>
          <div className="mesh-gradient-blob"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
          <div className="floating-particle"></div>
        </div>

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 900,
                color: 'white',
                mb: 3,
                textShadow: '0 4px 12px rgba(0,0,0,0.2)',
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                letterSpacing: '-0.02em',
              }}
            >
              Ready to Get Started?
            </Typography>

            <Typography
              variant="h5"
              sx={{
                mb: 5,
                color: 'rgba(255,255,255,0.95)',
                maxWidth: 600,
                mx: 'auto',
                fontWeight: 400,
                lineHeight: 1.6,
                fontSize: { xs: '1.1rem', md: '1.3rem' },
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              Create your first contest in seconds and share it with your friends and family for an
              unforgettable game experience.
            </Typography>

            <Box sx={{ mb: 6 }}>
              <LandingCreateContestButton />
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: { xs: 1, sm: 4 },
                flexWrap: 'wrap',
                px: 2,
                maxWidth: { xs: '400px', sm: 'none' },
                mx: 'auto',
              }}
            >
              <LandingCTABadge text="No credit card required" />
              <LandingCTABadge text="Setup in under 2 minutes" />
              <LandingCTABadge text="Works on all devices" />
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}
