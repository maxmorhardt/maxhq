import { Box, Link, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { game as palette } from '../../../app/theme';

interface Props {
  icon: ReactNode;
  title: string;
  details: string;
  href?: string;
}

// one way to reach us: an icon tile, what it is, and the detail (a link when there is one)
export default function ContactMethodCard({ icon, title, details, href }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        py: 2,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          width: 44,
          height: 44,
          borderRadius: '12px',
          color: 'primary.main',
          bgcolor: alpha(palette.brand, 0.1),
          border: 1,
          borderColor: alpha(palette.brand, 0.3),
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
        {href ? (
          <Link
            href={href}
            underline="hover"
            sx={{ fontSize: '0.95rem', overflowWrap: 'anywhere' }}
          >
            {details}
          </Link>
        ) : (
          <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>{details}</Typography>
        )}
      </Box>
    </Box>
  );
}
