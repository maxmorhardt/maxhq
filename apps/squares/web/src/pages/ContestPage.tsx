import { Container } from '@mui/material';
import { useParams } from 'react-router';
import RequireAuth from '../auth/RequireAuth';
import SignInPrompt from '../auth/SignInPrompt';
import NotFoundError from '../components/errors/NotFoundError';
import ContestPageSkeleton from '../features/contests/components/ContestPageSkeleton';
import LiveContest from '../features/contests/components/LiveContest';
import { isUuid } from '../utils/ids';

export default function ContestPage() {
  const { id = '' } = useParams<{ id: string }>();

  // an id that cannot be a contest is answered at once instead of asking the server
  if (!isUuid(id)) {
    return <NotFoundError />;
  }

  return (
    <RequireAuth
      fallback={<ContestPageSkeleton />}
      unauthenticated={
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
          <SignInPrompt
            title="Sign in to see this board"
            description="Contests are only visible to people who are signed in. It's free, and you'll come right back here."
          />
        </Container>
      }
    >
      {/* keyed so moving between contests starts from a clean slate */}
      <LiveContest key={id} contestId={id} />
    </RequireAuth>
  );
}
