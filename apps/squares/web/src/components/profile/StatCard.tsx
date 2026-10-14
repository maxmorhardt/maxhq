import { Box, Paper, Typography, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

export interface StatCardProps {
  icon: ReactNode;
  value: number | undefined;
  label: string;
  caption?: string;
  highlight?: boolean;
}

export default function StatCard({ icon, value, label, caption, highlight }: StatCardProps) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        textAlign: 'center',
        px: 2,
        py: 1.75,
        borderRadius: 3,
        background: highlight
          ? `linear-gradient(135deg, ${theme.palette.primary.dark}33 0%, ${theme.palette.primary.main}22 100%)`
          : 'rgba(255,255,255,0.04)',
        border: highlight
          ? `1px solid ${theme.palette.primary.main}66`
          : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: 0.5,
          color: 'primary.main',
          fontSize: 26,
        }}
      >
        {icon}
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.25 }}>
        {value?.toLocaleString() ?? '–'}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {label}
      </Typography>
      {caption && (
        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
          {caption}
        </Typography>
      )}
    </Paper>
  );
}
