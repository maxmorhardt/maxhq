import { Box, Typography } from '@mui/material';

export default function ContactHeader() {
  return (
    <Box sx={{ textAlign: 'center', mb: 8 }}>
      <Typography
        variant="h2"
        sx={{
          fontWeight: 700,
          mb: 2,
          background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Contact Us
      </Typography>
      <Typography
        variant="h6"
        sx={{
          color: 'rgba(255,255,255,0.8)',
          maxWidth: 600,
          mx: 'auto',
          fontWeight: 400,
        }}
      >
        Have a question or need help? We'd love to hear from you. Send us a message and we'll
        respond as soon as possible.
      </Typography>
    </Box>
  );
}
