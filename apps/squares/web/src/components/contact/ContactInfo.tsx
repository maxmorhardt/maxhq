import { Box, Card, CardContent, Typography } from '@mui/material';
import { Email, Phone, LocationOn } from '@mui/icons-material';

export default function ContactInfo() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card
        sx={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Email sx={{ color: '#667eea', mr: 2 }} />
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
              Email
            </Typography>
          </Box>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
            support@squares.maxstash.io
          </Typography>
        </CardContent>
      </Card>

      <Card
        sx={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Phone sx={{ color: '#667eea', mr: 2 }} />
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
              Phone
            </Typography>
          </Box>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>Available via email only</Typography>
        </CardContent>
      </Card>

      <Card
        sx={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <LocationOn sx={{ color: '#667eea', mr: 2 }} />
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
              Response Time
            </Typography>
          </Box>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
            We typically respond within 24 hours
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
