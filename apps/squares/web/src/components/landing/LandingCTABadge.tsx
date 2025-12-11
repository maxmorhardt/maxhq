import { Box, Typography } from '@mui/material';

interface LandingCTABadgeProps {
  text: string;
}

export default function LandingCTABadge({ text }: LandingCTABadgeProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        px: { xs: 1.5, sm: 3 },
        py: { xs: 0.9, sm: 1.5 },
        borderRadius: 2,
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        transition: 'all 0.3s ease',
        flex: { xs: '1 1 100%', sm: '0 0 auto' },
        maxWidth: { xs: '14em', sm: 'none' },
        '&:hover': {
          background: 'rgba(255, 255, 255, 0.25)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Typography
        variant="body1"
        sx={{
          color: 'white',
          fontWeight: 600,
          fontSize: { xs: '0.85rem', sm: '1rem' },
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        ✅ {text}
      </Typography>
    </Box>
  );
}
