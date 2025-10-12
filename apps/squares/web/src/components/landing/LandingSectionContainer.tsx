import { Box, Container, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

interface LandingSectionContainerProps {
  variant?: 'lightBlue' | 'black';
  children: ReactNode;
}

export default function LandingSectionContainer({
  children,
  variant = 'black',
}: LandingSectionContainerProps) {
  const theme = useTheme();

  const getBackground = () => {
    switch (variant) {
      case 'lightBlue':
        return theme.customBackgrounds.gradients.lightBlue;
      case 'black':
        return theme.customBackgrounds.gradients.black;
      default:
        return theme.customBackgrounds.gradients.black;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 16 }}>
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 4,
          background: getBackground(),
          borderRadius: 4,
          position: 'relative',
          border: theme.customBorders.glass,
        }}
      >
        {children}
      </Box>
    </Container>
  );
}
