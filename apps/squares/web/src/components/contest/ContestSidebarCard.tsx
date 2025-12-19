import { Box, Typography, Divider, Paper, useTheme } from '@mui/material';
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
  const theme = useTheme();

  return (
    <Paper
      sx={{
        background: theme.palette.grey[900],
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 3,
        p: 2.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box sx={{ color: iconColor, display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'bold',
            color: 'white',
            fontSize: '1.05rem',
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
