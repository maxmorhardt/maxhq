import { Box, Typography, useTheme } from '@mui/material';
import LandingSectionContainer from './LandingSectionContainer';
import FeatureCard from './FeatureCard';

type GradientType = 'primary' | 'pink' | 'cyan' | 'mint' | 'secondary' | 'lightBlue' | 'black';

interface Feature {
  emoji: string;
  gradient: GradientType;
  title: string;
  description: string;
}

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
    description: 'Share contests with a simple link - no accounts required for participants',
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

export default function LandingFeatures() {
  const theme = useTheme();

  return (
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
          background: theme.customBackgrounds.gradients.textGradient,
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
          color: theme.customColors.textMuted,
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
          <FeatureCard
            key={index}
            emoji={feature.emoji}
            gradient={feature.gradient}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </Box>
    </LandingSectionContainer>
  );
}
