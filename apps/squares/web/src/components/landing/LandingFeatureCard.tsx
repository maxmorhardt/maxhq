import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { gradients } from '../../types/gradients';

interface LandingFeatureCardProps {
  icon?: ReactNode;
  gradient: 'primary' | 'pink' | 'cyan' | 'mint' | 'secondary' | 'lightBlue' | 'black' | 'green';
  title: string;
  description: string;
}

const size = 80;

export default function LandingFeatureCard({
  icon,
  gradient,
  title,
  description,
}: LandingFeatureCardProps) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      {/* circular icon container with gradient background */}
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: gradients[gradient],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 3,
        }}
      >
        <Box sx={{ color: 'white', display: 'flex', fontSize: size * 0.5 }}>{icon}</Box>
      </Box>
      {/* feature title and description */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
        {description}
      </Typography>
    </Box>
  );
}
