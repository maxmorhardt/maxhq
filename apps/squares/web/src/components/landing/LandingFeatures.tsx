import { Box, Container, Typography } from '@mui/material';

export default function LandingFeatures() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
          borderRadius: 4,
          p: 6,
          mb: 8,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
        }}
      >
        <Typography
          variant="h3"
          component="h2"
          gutterBottom
          sx={{
            textAlign: 'center',
            mb: 2,
            fontWeight: 700,
            color: 'white',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Why Choose Our Platform?
        </Typography>
        <Typography
          variant="h6"
          sx={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.7)',
            mb: 6,
            maxWidth: 600,
            mx: 'auto',
            fontWeight: 400,
          }}
        >
          Built for simplicity, designed for everyone
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' },
            gap: 4,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                ⚡
              </Typography>
            </Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
              Real-time Updates
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
              See changes instantly as players fill out squares with live synchronization
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                boxShadow: '0 4px 12px rgba(245, 87, 108, 0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                🔗
              </Typography>
            </Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
              Easy Sharing
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
              Share contests with a simple link - no accounts required for participants
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                boxShadow: '0 4px 12px rgba(79, 172, 254, 0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                📱
              </Typography>
            </Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
              Mobile Friendly
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
              Works perfectly on phones, tablets, and computers with responsive design
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                boxShadow: '0 4px 12px rgba(168, 237, 234, 0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                🆓
              </Typography>
            </Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
              Free to Use
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
              Create unlimited contests for all your gatherings at no cost
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
