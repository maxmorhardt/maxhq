import { Box, Typography } from '@mui/material';
import { gradients, type GradientType } from '../../types/gradients';

interface GradientIconProps {
  character: string;
  gradient: GradientType;
  size?: number;
}

export default function GradientIcon({ character, gradient, size = 80 }: GradientIconProps) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: gradients[gradient],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mx: 'auto',
        mb: 3,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
        {character}
      </Typography>
    </Box>
  );
}
