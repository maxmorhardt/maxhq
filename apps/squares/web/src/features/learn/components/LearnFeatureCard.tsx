import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { JSX } from 'react';
import { game } from '../../../app/theme';

interface LearnFeatureCardProps {
  icon: JSX.Element;
  title: string;
  description: string;
}

export default function LearnFeatureCard({ icon, title, description }: LearnFeatureCardProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 2.5,
        py: 3.5,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 44,
          height: 44,
          borderRadius: '12px',
          color: 'primary.main',
          bgcolor: alpha(game.brand, 0.1),
          border: 1,
          borderColor: alpha(game.brand, 0.3),
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h3" component="h3" sx={{ fontSize: '1.55rem', lineHeight: 1.05 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary', lineHeight: 1.65 }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}
