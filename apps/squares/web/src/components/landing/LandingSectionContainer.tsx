import { Box, Container } from '@mui/material';
import type { ReactNode } from 'react';
import { gradients } from '../../types/gradients';

interface LandingSectionContainerProps {
  variant?: 'lightBlue' | 'black';
  children: ReactNode;
}

export default function LandingSectionContainer({
  children,
  variant = 'black',
}: LandingSectionContainerProps) {
  return (
    <Container maxWidth="lg" sx={{ pb: 16 }}>
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 4,
          background: gradients[variant],
          borderRadius: 4,
          position: 'relative',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {children}
      </Box>
    </Container>
  );
}
