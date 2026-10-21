import { Box, Typography } from '@mui/material';
import type { ReactNode, Ref } from 'react';
import { fonts } from '../../../../app/theme';

interface Props {
  step: number;
  title: string;
  description?: string;
  error?: string;
  ref?: Ref<HTMLElement>;
  children: ReactNode;
}

// one numbered step of the form: its number and title, a line of help, then the field
export default function FormSection({ step, title, description, error, ref, children }: Props) {
  return (
    <Box
      component="section"
      ref={ref}
      aria-label={title}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: '18px',
        border: 1,
        borderColor: error ? 'error.main' : 'divider',
        bgcolor: 'background.paper',
        scrollMarginTop: 96,
        transition: 'border-color 160ms',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: description ? 0.5 : 2 }}>
        <Typography
          component="span"
          sx={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: '1.6rem',
            lineHeight: 1,
            color: error ? 'error.main' : 'primary.main',
          }}
        >
          {step}
        </Typography>
        <Typography
          component="h2"
          sx={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: '1.35rem',
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Typography>
      </Box>
      {description && (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem', mb: 2 }}>
          {description}
        </Typography>
      )}
      {children}
      {error && (
        <Typography role="alert" sx={{ color: 'error.main', fontSize: '0.85rem', mt: 1.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
