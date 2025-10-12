import { Box, Typography, useTheme } from '@mui/material';
import GradientIcon from '../common/GradientIcon';

interface FeatureCardProps {
  emoji: string;
  gradient: 'primary' | 'pink' | 'cyan' | 'mint' | 'secondary' | 'lightBlue' | 'black';
  title: string;
  description: string;
}

export default function FeatureCard({ emoji, gradient, title, description }: FeatureCardProps) {
  const theme = useTheme();

  return (
    <Box sx={{ textAlign: 'center' }}>
      <GradientIcon character={emoji} gradient={gradient} />
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ lineHeight: 1.6, color: theme.customColors.textMuted }}>
        {description}
      </Typography>
    </Box>
  );
}
