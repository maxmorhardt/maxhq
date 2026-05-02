import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';

interface LearnHowItWorksCardProps {
  color?: string;
  stepNumber: number;
  title: string;
  description: string;
}

export default function LearnHowItWorksCard({
  color,
  stepNumber,
  title,
  description,
}: LearnHowItWorksCardProps) {
  const theme = useTheme();

  return (
    // step card with numbered badge
    <Card
      sx={{
        background: theme.palette.grey[900],
        border: `1px solid ${theme.palette.grey[800]}`,
        borderRadius: 3,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          transform: 'translateY(-6px)',
          borderColor: color ?? theme.palette.grey[700],
          boxShadow: `0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px ${color ?? theme.palette.grey[700]}22`,
        },
      }}
    >
      <CardContent sx={{ p: 4, textAlign: 'center' }}>
        {/* circular step number badge */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
            {stepNumber}
          </Typography>
        </Box>
        {/* step title and description */}
        <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}
