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
        alignItems: { xs: 'stretch', md: 'center' },
        gap: { xs: 2, md: 4 },
        mb: { xs: 4, md: 6 },
      }}
    >
      <Box
        sx={{
          flex: '0 0 auto',
          width: { xs: 60, md: 100 },
          height: { xs: 60, md: 100 },
          borderRadius: '50%',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: { xs: '1.5rem', md: '2.5rem' },
          fontWeight: 900,
          color: 'white',
          boxShadow: `0 2px 8px ${shadowColor}`,
          alignSelf: { xs: 'center', md: 'auto' },
        }}
      >
        {step}
      </Box>
      <Box
        sx={{
          flex: 1,
          background: gradientLight,
          borderRadius: { xs: 2, md: 3 },
          p: { xs: 2.5, md: 4 },
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
            mb: { xs: 1.5, md: 2 },
            color: 'text.primary',
            fontSize: { xs: '1.1rem', md: '1.5rem' },
          }}
        >
          {title}
        </Typography>
        {children}
      </Box>
    </Box>
  );
}
