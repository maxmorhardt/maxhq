import { useParams } from 'react-router';
import RequireAuth from '../auth/RequireAuth';
import ContestPageSkeleton from '../features/contests/components/ContestPageSkeleton';
import LiveContest from '../features/contests/components/LiveContest';

export default function ContestPage() {
  const { id = '' } = useParams<{ id: string }>();

  return (
    <RequireAuth fallback={<ContestPageSkeleton />}>
      {/* keyed so moving between contests starts from a clean slate */}
      <LiveContest key={id} contestId={id} />
    </RequireAuth>
  );
}
