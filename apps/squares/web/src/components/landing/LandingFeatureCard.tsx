import { Box, Typography } from '@mui/material';
import GradientIcon from '../common/GradientIcon';

interface LandingFeatureCardProps {
  emoji: string;
  gradient: 'primary' | 'pink' | 'cyan' | 'mint' | 'secondary' | 'lightBlue' | 'black';
  title: string;
  description: string;
}

export default function LandingFeatureCard({
  emoji,
  gradient,
  title,
  description,
}: LandingFeatureCardProps) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <GradientIcon character={emoji} gradient={gradient} />
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
        {description}
      </Typography>
    </Box>
  );
}
