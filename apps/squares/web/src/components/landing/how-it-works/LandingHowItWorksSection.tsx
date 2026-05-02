import { EmojiEvents, GridOn, Groups, Shuffle } from '@mui/icons-material';
import { Box, Container, Typography } from '@mui/material';
import type { RefObject } from 'react';
import LandingHowItWorksCard from './LandingHowItWorksCard';

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

interface Props {
  animRef: RefObject<HTMLDivElement | null>;
  isVisible: boolean;
}

export default function LandingHowItWorksSection({ animRef, isVisible }: Props) {
  return (
    <Container maxWidth="lg" sx={{ mb: 14 }}>
      <Box
        ref={animRef}
        className={`scroll-section ${isVisible ? 'visible' : ''}`}
        sx={{ textAlign: 'center' }}
      >
        <Typography
          variant="h3"
          className="reveal"
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
          className="reveal delay-1"
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
            <Box key={index} className={`reveal delay-${index + 2}`}>
              <LandingHowItWorksCard
                icon={step.icon}
                title={step.title}
                description={step.description}
                backgroundColor={step.backgroundColor}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
}
