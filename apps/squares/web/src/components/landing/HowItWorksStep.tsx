import type { SvgIconComponent } from '@mui/icons-material';
import { Box, Paper, Typography, useTheme } from '@mui/material';

interface HowItWorksStepProps {
  icon: SvgIconComponent;
  title: string;
  description: string;
  backgroundColor: string;
}

export default function HowItWorksStep({
  icon: Icon,
  title,
  description,
  backgroundColor,
}: HowItWorksStepProps) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        transition: theme.customTransitions.default,
        '&:hover': {
          transform: theme.customTransforms.hoverLiftMedium,
          boxShadow: theme.customShadows.interactive,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor,
            color: 'white',
            mr: 3,
          }}
        >
          <Icon sx={{ fontSize: 32 }} />
        </Box>
        <Box sx={{ textAlign: 'left' }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {description}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
