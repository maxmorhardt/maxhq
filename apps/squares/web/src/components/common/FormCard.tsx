import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';

interface ContactInfoCardProps {
  icon: React.ReactNode;
  title: string;
  details: string;
}

export default function FormCard({ icon, title, details }: ContactInfoCardProps) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        background: theme.palette.grey[900],
        border: `1px solid ${theme.palette.grey[800]}`,
        borderRadius: 3,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>{details}</Typography>
      </CardContent>
    </Card>
  );
}
