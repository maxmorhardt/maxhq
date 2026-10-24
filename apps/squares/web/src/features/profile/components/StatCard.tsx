import { Box, CircularProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { fonts, game as palette } from '../../../app/theme';
import { formatCount } from '../../../utils/formatCount';

interface StatCardProps {
  icon: ReactNode;
  value: number | undefined;
  label: string;
  caption?: string;
  highlight?: boolean;
  // a share from 0 to 100, drawn as a ring around the icon
  progress?: number;
}

// one career number: its icon, the figure in scoreboard type, and what it counts
export default function StatCard({
  icon,
  value,
  label,
  caption,
  highlight,
  progress,
}: StatCardProps) {
  const color = highlight ? palette.gold : palette.brand;

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: '18px',
        border: 1,
        borderColor: highlight ? alpha(palette.gold, 0.4) : 'divider',
        background: highlight
          ? `linear-gradient(150deg, ${alpha(palette.gold, 0.12)}, ${palette.field} 60%)`
          : palette.field,
        display: 'grid',
        gap: 1.5,
        minWidth: 0,
      }}
    >
      <Box sx={{ position: 'relative', width: 44, height: 44 }}>
        {progress !== undefined && (
          <CircularProgress
            variant="determinate"
            value={progress}
            size={44}
            thickness={3}
            aria-hidden
            sx={{ position: 'absolute', inset: 0, color }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            inset: progress !== undefined ? 5 : 0,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            color,
            bgcolor: alpha(color, 0.12),
            fontSize: 20,
          }}
        >
          {icon}
        </Box>
      </Box>

      <Box>
        <Typography
          title={value?.toLocaleString('en-US')}
          sx={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: { xs: '2.4rem', sm: '2.8rem' },
            lineHeight: 1,
            color: highlight ? palette.gold : 'text.primary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value === undefined ? '–' : formatCount(value)}
        </Typography>
        <Typography sx={{ mt: 0.75, fontWeight: 600 }}>{label}</Typography>
        {caption && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {caption}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
