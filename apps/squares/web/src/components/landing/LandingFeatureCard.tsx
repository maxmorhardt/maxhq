import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import GradientIcon from '../common/GradientIcon';

interface LandingFeatureCardProps {
  emoji?: string;
  icon?: ReactNode;
  gradient: 'primary' | 'pink' | 'cyan' | 'mint' | 'secondary' | 'lightBlue' | 'black' | 'green';
  title: string;
  description: string;
}

export default function LandingFeatureCard({
  emoji,
  icon,
  gradient,
  title,
  description,
}: LandingFeatureCardProps) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <GradientIcon character={emoji} icon={icon} gradient={gradient} />
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
        {description}
      </Typography>
    </Box>
  );
}
