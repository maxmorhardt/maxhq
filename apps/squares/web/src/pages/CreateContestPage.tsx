import { ArrowBack } from '@mui/icons-material';
import { Box, Button, Container, Skeleton } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router';
import RequireAuth from '../auth/RequireAuth';
import PageTitle from '../components/PageTitle';
import CreateContestForm from '../features/contests/components/create/CreateContestForm';

export default function CreateContestPage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, mb: 2.5 }}>
      <Helmet>
        <title>Create Contest – Squares</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Button
        component={Link}
        to="/contests"
        startIcon={<ArrowBack />}
        size="small"
        sx={{ color: 'text.secondary', mb: 2 }}
      >
        Back to Contests
      </Button>

      <PageTitle
        align="left"
        title="Create New Contest"
        subtitle="Pick this week's game, name it, and share the link. The live score does the rest."
      />

      <RequireAuth
        fallback={
          <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 300px' }, gap: 4 }}>
            <Skeleton variant="rounded" height={520} sx={{ borderRadius: '18px' }} />
            <Skeleton variant="rounded" height={360} sx={{ borderRadius: '18px' }} />
          </Box>
        }
      >
        <CreateContestForm />
      </RequireAuth>
    </Container>
  );
}
