import { AttachMoney, Bolt, Link, PhoneAndroid } from '@mui/icons-material';
import { Box, Container, Typography, useTheme } from '@mui/material';
import type { ReactNode, RefObject } from 'react';
import LandingFeatureCard from './LandingFeatureCard';
import { gradients } from '../../../types/gradients';

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
  icon?: ReactNode;
  gradient: GradientType;
  title: string;
  description: string;
}

const featureDetails: Feature[] = [
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

interface Props {
  animRef: RefObject<HTMLDivElement | null>;
  isVisible: boolean;
}

export default function LandingFeaturesSection({ animRef, isVisible }: Props) {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ pb: 14 }}>
      <Box
        ref={animRef}
        className={`scroll-rise-blur ${isVisible ? 'visible' : ''}`}
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
          {featureDetails.map((feature, index) => (
            <LandingFeatureCard
              key={index}
              icon={feature.icon}
              gradient={feature.gradient}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </Box>
      </Box>
    </Container>
  );
}
