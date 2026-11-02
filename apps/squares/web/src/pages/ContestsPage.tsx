import { Container } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import RequireAuth from '../auth/RequireAuth';
import SignInPrompt from '../auth/SignInPrompt';
import ContestsBrowser, {
  ContestsBrowserSkeleton,
} from '../features/contests/components/list/ContestsBrowser';

export default function ContestsPage() {
  return (
    <>
      <Helmet>
        <title>Contests – Squares</title>
        <meta name="description" content="Browse and manage your NFL football squares contests." />
        <link rel="canonical" href="https://squares.maxhq.io/contests" />
      </Helmet>
      <RequireAuth
        fallback={<ContestsBrowserSkeleton />}
        unauthenticated={
          <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
            <SignInPrompt
              title="Sign in to see your contests"
              description="Your boards and the ones you've joined live here. It's free, and you sign in with an account you already have."
            />
          </Container>
        }
      >
        <ContestsBrowser />
      </RequireAuth>
    </>
  );
}
