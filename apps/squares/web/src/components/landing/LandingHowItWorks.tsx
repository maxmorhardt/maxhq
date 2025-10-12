import {
  GridOn as GridIcon,
  Groups as GroupsIcon,
  Shuffle as ShuffleIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { Box, Container, Typography } from '@mui/material';
import HowItWorksStep from './HowItWorksStep';

const howItWorksSteps = [
  {
    icon: GridIcon,
    title: 'Fill Out the Squares',
    description:
      'Participants choose and fill out squares on a 10x10 contest grid. Each square represents a potential score combination.',
    backgroundColor: 'primary.main',
  },
  {
    icon: ShuffleIcon,
    title: 'Randomize Numbers',
    description:
      'Once all squares are filled, randomly assign numbers 0-9 to both the X and Y axis representing each team.',
    backgroundColor: 'secondary.main',
  },
  {
    icon: TrophyIcon,
    title: 'Determine Winners',
    description:
      "At the end of each quarter, take the last digit of both teams' scores to find the winning square.",
    backgroundColor: 'success.main',
  },
  {
    icon: GroupsIcon,
    title: 'Share & Collaborate',
    description:
      'Share your contest with friends and family. Everyone can see real-time updates as squares are filled.',
    backgroundColor: 'info.main',
  },
];

export default function LandingHowItWorks() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography
          variant="h3"
          gutterBottom
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
            gap: { xs: 1, sm: 1, md: 3 },
          }}
        >
          {howItWorksSteps.map((step, index) => (
            <HowItWorksStep
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
  );
}
