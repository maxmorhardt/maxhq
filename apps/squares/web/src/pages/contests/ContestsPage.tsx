import { Alert, Box } from '@mui/material';
import { useEffect, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import ContestsTable from '../../components/contests/ContestsTable';
import ContestsTableSkeleton from '../../components/contests/ContestsTableSkeleton';
import { selectContestError, selectContestLoading } from '../../features/contests/contestSelectors';
import { clearError } from '../../features/contests/contestSlice';
import { fetchContestsByUser } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';
import type { Contest, PaginatedContestsResponse } from '../../types/contest';

export default function ContestsPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();
  const dispatch = useAppDispatch();

  // owned contests state
  const [ownedContests, setOwnedContests] = useState<Contest[]>([]);
  const [ownedPage, setOwnedPage] = useState(0);
  const [ownedRowsPerPage, setOwnedRowsPerPage] = useState(5);
  const [ownedPagination, setOwnedPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const loading = useAppSelector(selectContestLoading);
  const error = useAppSelector(selectContestError);

  // fetch owned contests when authenticated and pagination changes
  useEffect(() => {
    if (!auth.isAuthenticated || !isInterceptorReady) {
      return;
    }

    const username = auth.user?.profile?.preferred_username;
    if (username) {
      dispatch(
        fetchContestsByUser({
          username,
          pagination: {
            page: ownedPage + 1,
            limit: ownedRowsPerPage,
          },
        })
      ).then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          const payload = result.payload as PaginatedContestsResponse;
          setOwnedContests(payload.contests);
          setOwnedPagination({
            page: payload.page,
            limit: payload.limit,
            total: payload.total,
            totalPages: payload.totalPages,
            hasNext: payload.hasNext,
            hasPrevious: payload.hasPrevious,
          });
        }
      });
    }
  }, [auth.isAuthenticated, auth.user, dispatch, isInterceptorReady, ownedPage, ownedRowsPerPage]);

  // handle owned contests pagination
  const handleOwnedPageChange = (_event: MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setOwnedPage(newPage);
  };

  const handleOwnedRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setOwnedRowsPerPage(parseInt(event.target.value, 10));
    setOwnedPage(0);
  };

  // show skeleton while auth is loading
  if (auth.isLoading && auth.activeNavigator !== 'signoutSilent') {
    return (
      <Box>
        <ContestsTableSkeleton title="My Contests" rowCount={2} />
      </Box>
    );
  }

  // show warning if not authenticated but still render tables
  if (!auth.isAuthenticated) {
    return (
      <>
        <Box sx={{ px: 3, pt: 3 }}>
          <Alert severity="warning">Sign in to view your contests</Alert>
        </Box>

        <ContestsTable
          contests={[]}
          totalCount={0}
          page={0}
          rowsPerPage={5}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
          title="My Contests"
        />
      </>
    );
  }

  // show skeleton while loading or waiting for axios interceptor
  if (!isInterceptorReady || loading) {
    return (
      <Box>
        <ContestsTableSkeleton title="My Contests" rowCount={2} />
      </Box>
    );
  }

  return (
    <Box>
      {/* error alert for failed data fetches */}
      {error && (
        <Box sx={{ px: 3, pt: 3 }}>
          <Alert severity="error" onClose={() => dispatch(clearError())}>
            {error}
          </Alert>
        </Box>
      )}

      {/* owned contests table */}
      <ContestsTable
        contests={ownedContests}
        totalCount={ownedPagination.total}
        page={ownedPage}
        rowsPerPage={ownedRowsPerPage}
        onPageChange={handleOwnedPageChange}
        onRowsPerPageChange={handleOwnedRowsPerPageChange}
        title="My Contests"
      />
    </Box>
  );
}
