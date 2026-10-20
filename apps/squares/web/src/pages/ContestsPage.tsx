import { Helmet } from 'react-helmet-async';
import RequireAuth from '../auth/RequireAuth';
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
      <RequireAuth fallback={<ContestsBrowserSkeleton />}>
        <ContestsBrowser />
      </RequireAuth>
    </>
  );
}
