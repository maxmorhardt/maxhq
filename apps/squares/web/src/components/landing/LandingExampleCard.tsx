import { Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface LandingExampleCardProps {
  title: string;
  children: ReactNode;
  isCentered?: boolean;
}

export default function LandingExampleCard({
  title,
  children,
  isCentered = false,
}: LandingExampleCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.15)',
        textAlign: isCentered ? 'center' : 'left',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'white' }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
