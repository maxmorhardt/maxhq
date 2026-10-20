import { ArrowBack } from '@mui/icons-material';
import { Box, Button, Container, Skeleton, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router';
import RequireAuth from '../auth/RequireAuth';
import CreateContestForm from '../features/contests/components/create/CreateContestForm';
import { gradients } from '../types/gradients';

export default function CreateContestPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 }, mb: 2.5 }}>
      <Helmet>
        <title>Create Contest – Squares</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Box sx={{ textAlign: 'center', mb: { xs: 1.5, sm: 2 } }}>
        <Typography
          component="h1"
          sx={{
            fontWeight: 700,
            mb: 1,
            background: gradients.textGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: { xs: '1.5rem', sm: '1.85rem' },
          }}
        >
          Create New Contest
        </Typography>
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 560,
            mx: 'auto',
            fontSize: { xs: '0.85rem', sm: '0.95rem' },
          }}
        >
          Set up your squares contest in minutes.
        </Typography>
      </Box>

      <Box sx={{ mb: 1 }}>
        <Button
          component={Link}
          to="/contests"
          startIcon={<ArrowBack />}
          size="small"
          sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}
        >
          Back to Contests
        </Button>
      </Box>

      <RequireAuth fallback={<Skeleton variant="rounded" height={480} sx={{ borderRadius: 3 }} />}>
        <CreateContestForm />
      </RequireAuth>
    </Container>
  );
}
