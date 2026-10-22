import { Box, Typography, Divider, Paper, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

interface ContestSidebarCardProps {
  icon: ReactNode;
  iconColor?: string;
  title: string;
  children: ReactNode;
  fillHeight?: boolean;
}

export default function ContestSidebarCard({
  icon,
  iconColor = '#3d9bff',
  title,
  children,
  fillHeight = false,
}: ContestSidebarCardProps) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '14px',
        p: 1.75,
        textAlign: 'left',
        // fills what its column has left on wide screens, so the column matches the board
        ...(fillHeight && {
          flex: { lg: 1 },
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }),
      }}
    >
      {/* card header with icon and title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        <Box sx={{ color: iconColor, display: 'flex', alignItems: 'center', fontSize: '1.1rem' }}>
          {icon}
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            fontSize: '1rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Typography>
      </Box>

      <Divider sx={{ mb: 1.25 }} />

      {children}
    </Paper>
  );
}
