import type { SvgIconComponent } from '@mui/icons-material';
import { Box, Paper, Typography } from '@mui/material';

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
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
          borderColor: 'primary.main',
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
