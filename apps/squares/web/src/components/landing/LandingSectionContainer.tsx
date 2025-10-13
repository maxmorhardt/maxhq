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
  const getBackground = () => {
    switch (variant) {
      case 'lightBlue':
        return gradients.lightBlue;
      case 'black':
        return gradients.black;
      default:
        return gradients.black;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 4,
          background: getBackground(),
          borderRadius: 4,
          position: 'relative',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        {children}
      </Box>
    </Container>
  );
}
