import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { fonts, game as palette } from '../../../app/theme';

export interface StatCardProps {
  icon: ReactNode;
  value: number | undefined;
  label: string;
  caption?: string;
  highlight?: boolean;
}

// one cell of the stats strip: a label, the number in scoreboard type, and an optional note
export default function StatCard({ icon, value, label, caption, highlight }: StatCardProps) {
  return (
    <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2.25, minWidth: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          color: highlight ? palette.gold : 'text.secondary',
          fontSize: 18,
        }}
      >
        {icon}
        <Typography
          sx={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'inherit',
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        sx={{
          mt: 0.75,
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: { xs: '2.2rem', sm: '2.6rem' },
          lineHeight: 1,
          color: highlight ? palette.gold : 'text.primary',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value?.toLocaleString() ?? '–'}
      </Typography>
      {caption && (
        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
          {caption}
        </Typography>
      )}
    </Box>
  );
}
