import { useEffect, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import { Box, Alert } from '@mui/material';
import ContestsTable from '../../components/contests/ContestsTable';
import ContestsTableSkeleton from '../../components/contests/ContestsTableSkeleton';
import {
  selectContestError,
  selectContestLoading,
} from '../../features/contests/contestSelectors';
import { clearError } from '../../features/contests/contestSlice';
import { fetchContestsByUser, fetchParticipatingContests } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';
import { useToast } from '../../hooks/useToast';
import type { Contest, PaginatedContestsResponse } from '../../types/contest';

// contests page displaying user's contests in a paginated table
export default function ContestsPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  
  // separate state for owned contests
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
  
  // separate state for participating contests
  const [participatingContests, setParticipatingContests] = useState<Contest[]>([]);
  const [participatingPage, setParticipatingPage] = useState(0);
  const [participatingRowsPerPage, setParticipatingRowsPerPage] = useState(5);
  const [participatingPagination, setParticipatingPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const loading = useAppSelector(selectContestLoading);
  const error = useAppSelector(selectContestError);

  // show error toast and clear from store
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      dispatch(clearError());
    }
  }, [error, showToast, dispatch]);

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

  // fetch participating contests when authenticated and pagination changes
  useEffect(() => {
    if (!auth.isAuthenticated || !isInterceptorReady) {
      return;
    }

    dispatch(
      fetchParticipatingContests({
        page: participatingPage + 1,
        limit: participatingRowsPerPage,
      })
    ).then((result) => {
      if (result.meta.requestStatus === 'fulfilled') {
        const payload = result.payload as PaginatedContestsResponse;
        setParticipatingContests(payload.contests);
        setParticipatingPagination({
          page: payload.page,
          limit: payload.limit,
          total: payload.total,
          totalPages: payload.totalPages,
          hasNext: payload.hasNext,
          hasPrevious: payload.hasPrevious,
        });
      }
    });
  }, [auth.isAuthenticated, dispatch, isInterceptorReady, participatingPage, participatingRowsPerPage]);

  // handle owned contests pagination
  const handleOwnedPageChange = (_event: MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setOwnedPage(newPage);
  };

  const handleOwnedRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setOwnedRowsPerPage(parseInt(event.target.value, 10));
    setOwnedPage(0);
  };

  // handle participating contests pagination
  const handleParticipatingPageChange = (_event: MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setParticipatingPage(newPage);
  };

  const handleParticipatingRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setParticipatingRowsPerPage(parseInt(event.target.value, 10));
    setParticipatingPage(0);
  };

  // show skeleton while auth is loading
  if (auth.isLoading) {
    return (
      <Box>
        <ContestsTableSkeleton title="My Contests" rowCount={2} />
        <ContestsTableSkeleton title="Participating In" hideCreateButton={true} rowCount={2} />
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
        <ContestsTableSkeleton title="Participating In" hideCreateButton={true} rowCount={2} />
      </Box>
    );
  }

  return (
    <Box>
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

      {/* participating contests table */}
      <ContestsTable
        contests={participatingContests}
        totalCount={participatingPagination.total}
        page={participatingPage}
        rowsPerPage={participatingRowsPerPage}
        onPageChange={handleParticipatingPageChange}
        onRowsPerPageChange={handleParticipatingRowsPerPageChange}
        title="Participating In"
        hideCreateButton={true}
      />
    </Box>
  );
}
