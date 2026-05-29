import { Box, Container, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

interface LandingSectionContainerProps {
  children: ReactNode;
}

export default function LandingSectionContainer({ children }: LandingSectionContainerProps) {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ pb: 14 }}>
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 4,
          background: theme.palette.grey[900],
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
