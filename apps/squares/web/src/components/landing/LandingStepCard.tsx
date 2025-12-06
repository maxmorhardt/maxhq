import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface LandingStepCardProps {
  step: number;
  title: string;
  children: ReactNode;
  gradient: string;
  gradientLight: string;
  borderColor: string;
  shadowColor: string;
}

export default function LandingStepCard({
  step,
  title,
  children,
  gradient,
  gradientLight,
  borderColor,
  shadowColor,
}: LandingStepCardProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        gap: 4,
        mb: 6,
      }}
    >
      <Box
        sx={{
          flex: '0 0 auto',
          width: { xs: 80, md: 100 },
          height: { xs: 80, md: 100 },
          borderRadius: '50%',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: { xs: '2rem', md: '2.5rem' },
          fontWeight: 900,
          color: 'white',
          boxShadow: `0 2px 8px ${shadowColor}`,
        }}
      >
        {step}
      </Box>
      <Box
        sx={{
          flex: 1,
          background: gradientLight,
          borderRadius: 3,
          p: 4,
          border: '2px solid',
          borderColor: 'divider',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: borderColor,
            boxShadow: `0 2px 8px ${shadowColor}`,
          },
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 2,
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
        {children}
      </Box>
    </Box>
  );
}
