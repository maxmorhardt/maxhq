import { Box, Typography } from '@mui/material';
import { fonts } from '../../../app/theme';

interface LearnHowItWorksCardProps {
  stepNumber: number;
  title: string;
  description: string;
  final?: boolean;
}

export default function LearnHowItWorksCard({
  stepNumber,
  title,
  description,
  final = false,
}: LearnHowItWorksCardProps) {
  return (
    <Box
      sx={{
        height: '100%',
        p: { xs: 3, md: 3.5 },
        borderRadius: '16px',
        border: 1,
        borderColor: final ? 'secondary.main' : 'divider',
        bgcolor: 'background.default',
      }}
    >
      <Typography
        component="span"
        sx={{
          display: 'block',
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: '4rem',
          lineHeight: 0.85,
          color: final ? 'secondary.main' : 'primary.main',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {stepNumber}
      </Typography>
      <Typography variant="h3" component="h3" sx={{ mt: 2.5, fontSize: '1.7rem' }}>
        {title}
      </Typography>
      <Typography sx={{ mt: 1.25, color: 'text.secondary', lineHeight: 1.65 }}>
        {description}
      </Typography>
    </Box>
  );
}
