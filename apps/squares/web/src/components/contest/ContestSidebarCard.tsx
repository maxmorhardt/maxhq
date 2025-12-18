import { Box, Typography, Divider, Paper } from '@mui/material';
import type { ReactNode } from 'react';

interface ContestSidebarCardProps {
  icon: ReactNode;
  iconColor?: string;
  title: string;
  children: ReactNode;
}

export default function ContestSidebarCard({
  icon,
  iconColor = '#667eea',
  title,
  children,
}: ContestSidebarCardProps) {
  return (
    <Paper
      sx={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 3,
        p: 3,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box sx={{ color: iconColor, display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          {title}
        </Typography>
      </Box>
      <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
      {children}
    </Paper>
  );
}
