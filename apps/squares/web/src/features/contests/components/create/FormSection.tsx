import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
}

// a labelled form row: title and help text on the left, the field on the right
export default function FormSection({ title, description, children }: Props) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: '140px minmax(0, 1fr)' },
        columnGap: { sm: 3 },
        rowGap: 0.75,
        py: 1.5,
      }}
    >
      <Box>
        <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', mb: 0.5 }}>
          {title}
        </Typography>
        {description && (
          <Typography
            sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', lineHeight: 1.5 }}
          >
            {description}
          </Typography>
        )}
      </Box>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

export function SectionDivider() {
  return (
    <Box
      sx={{
        height: '1px',
        background:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
      }}
    />
  );
}
