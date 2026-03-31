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
        borderRadius: 2.5,
        p: 1.5,
      }}
    >
      {/* card header with icon and title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
        <Box sx={{ color: iconColor, display: 'flex', alignItems: 'center', fontSize: '1.1rem' }}>
          {icon}
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'bold',
            color: 'white',
            fontSize: '0.9rem',
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* divider */}
      <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* card content */}
      {children}
    </Paper>
  );
}
