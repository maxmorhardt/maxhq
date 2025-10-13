import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';

interface LearnFeatureCardProps {
  icon: JSX.Element;
  title: string;
  description: string;
}

export default function LearnFeatureCard({ icon, title, description }: LearnFeatureCardProps) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        background: theme.palette.grey[900],
        border: `1px solid ${theme.palette.grey[800]}`,
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 32px rgba(255,255,255,0.1)',
        },
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ mt: 0.5 }}>{icon}</Box>
          <Box>
            <Typography variant="h6" sx={{ color: 'white', mb: 1, fontWeight: 600 }}>
              {title}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
              {description}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
