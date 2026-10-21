import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { fonts } from '../app/theme';
import { popIn } from './animations';

interface Props {
  title: string;
  subtitle?: ReactNode;
  align?: 'left' | 'center';
}

// the condensed broadcast headline every top-level page opens with
export default function PageTitle({ title, subtitle, align = 'center' }: Props) {
  return (
    <Box
      sx={{
        textAlign: align,
        mb: { xs: 4, md: 5 },
        animation: `${popIn} 0.5s ease-out both`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Typography
        component="h1"
        sx={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: { xs: '2.6rem', md: '3.6rem' },
          lineHeight: 0.95,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Typography>
      {subtitle ? (
        <Typography
          sx={{
            color: 'text.secondary',
            mt: 1.5,
            mx: align === 'center' ? 'auto' : 0,
            maxWidth: 520,
            lineHeight: 1.6,
            fontSize: '1.05rem',
          }}
        >
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}
