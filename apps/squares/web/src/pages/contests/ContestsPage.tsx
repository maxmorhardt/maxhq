import { Alert, Box } from '@mui/material';
import { useEffect, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import ContestsTable from '../../components/contest/table/ContestsTable';
import ContestsTableSkeleton from '../../components/contest/table/ContestsTableSkeleton';
import RedirectingToLogin from '../../components/common/RedirectingToLogin';
import {
  selectContestError,
  selectContestLoading,
  selectContests,
  selectMyContests,
} from '../../features/contests/contestSelectors';
import { clearError } from '../../features/contests/contestSlice';
import { fetchContestsByOwner, fetchMyContests } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';
import type { PaginatedContestsResponse } from '../../types/contest';

export default function ContestsPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();
  const dispatch = useAppDispatch();

  // owned contests state
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

  // joined contests state (no pagination — API returns full array)

  const loading = useAppSelector(selectContestLoading);
  const error = useAppSelector(selectContestError);
  const ownedContests = useAppSelector(selectContests);
  const joinedContests = useAppSelector(selectMyContests);

  // fetch owned contests when authenticated and pagination changes
  useEffect(() => {
    if (!auth.isAuthenticated || !isInterceptorReady) {
      return;
    }

    const owner = auth.user?.profile?.preferred_username;
    if (owner) {
      dispatch(
        fetchContestsByOwner({
          owner,
          pagination: {
            page: ownedPage + 1,
            limit: ownedRowsPerPage,
          },
        })
      ).then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          const payload = result.payload as PaginatedContestsResponse;
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

  // fetch joined contests
  useEffect(() => {
    if (!auth.isAuthenticated || !isInterceptorReady) {
      return;
    }

    dispatch(fetchMyContests());
  }, [auth.isAuthenticated, dispatch, isInterceptorReady]);

  // handle owned contests pagination
  const handleOwnedPageChange = (_event: MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setOwnedPage(newPage);
  };

  const handleOwnedRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setOwnedRowsPerPage(parseInt(event.target.value, 10));
    setOwnedPage(0);
  };

  // show redirecting component while signin redirect is in progress
  if (auth.isLoading && auth.activeNavigator === 'signinRedirect') {
    return <RedirectingToLogin />;
  }

  // show skeleton while auth is loading
  if (auth.isLoading && auth.activeNavigator !== 'signoutSilent') {
    return (
      <Box>
        <ContestsTableSkeleton title="My Contests" rowCount={2} />
        <ContestsTableSkeleton title="Joined Contests" rowCount={2} hideCreateButton />
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
        <ContestsTableSkeleton title="Joined Contests" rowCount={2} hideCreateButton />
      </Box>
    );
  }

  // filter out owned contests from joined list to avoid duplicates
  const ownedIds = new Set(ownedContests.map((c) => c.id));
  const joinedOnly = joinedContests.filter((c) => !ownedIds.has(c.id));

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

      {/* joined contests table */}
      <ContestsTable
        contests={joinedOnly}
        totalCount={joinedOnly.length}
        page={0}
        rowsPerPage={5}
        onPageChange={() => {}}
        onRowsPerPageChange={() => {}}
        title="Joined Contests"
        hideCreateButton
      />
    </Box>
  );
}
