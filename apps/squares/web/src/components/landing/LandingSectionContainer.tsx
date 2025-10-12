import { Box, Container } from '@mui/material';
import type { ReactNode } from 'react';

interface LandingSectionContainerProps {
  backgroundGradient?: string;
  children: ReactNode;
}

export default function LandingSectionContainer({
  children,
  backgroundGradient = 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
}: LandingSectionContainerProps) {
  return (
    <Container maxWidth="lg" sx={{ pb: 16 }}>
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
					px: 4,
          background: backgroundGradient,
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
