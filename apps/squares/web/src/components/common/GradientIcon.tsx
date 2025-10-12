import { Box, Typography, useTheme } from '@mui/material';

interface GradientIconProps {
  character: string;
  gradient: 'primary' | 'pink' | 'cyan' | 'mint' | 'secondary' | 'lightBlue' | 'black';
  size?: number;
}

export default function GradientIcon({ character, gradient, size = 80 }: GradientIconProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: theme.customBackgrounds.gradients[gradient],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mx: 'auto',
        mb: 3,
        boxShadow: theme.customShadows.elevated,
        border: theme.customBorders.glass,
      }}
    >
      <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
        {character}
      </Typography>
    </Box>
  );
}
