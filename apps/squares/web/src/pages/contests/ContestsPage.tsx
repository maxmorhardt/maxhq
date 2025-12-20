import { useEffect, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import { Box, Alert } from '@mui/material';
import ContestsTable from '../../components/contests/ContestsTable';
import ContestsTableSkeleton from '../../components/contests/ContestsTableSkeleton';
import {
  selectContestError,
  selectContestLoading,
  selectContestPagination,
  selectContests,
} from '../../features/contests/contestSelectors';
import { clearError } from '../../features/contests/contestSlice';
import { fetchContestsByUser } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';
import { useToast } from '../../hooks/useToast';

export default function ContestsPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const contests = useAppSelector(selectContests);
  const loading = useAppSelector(selectContestLoading);
  const error = useAppSelector(selectContestError);
  const pagination = useAppSelector(selectContestPagination);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      dispatch(clearError());
    }
  }, [error, showToast, dispatch]);

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
            page: page + 1, // mui starts at 0
            limit: rowsPerPage,
          },
        })
      );
    }
  }, [auth.isAuthenticated, auth.user, dispatch, isInterceptorReady, page, rowsPerPage]);

  const handleChangePage = (_event: MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (auth.isLoading) {
    return <ContestsTableSkeleton />;
  }

  if (!auth.isAuthenticated) {
    return (
      <>
        <Box sx={{ px: 3, pt: 3 }}>
          <Alert severity="warning">Sign in to view your contests</Alert>
        </Box>

        <ContestsTable
          contests={contests}
          totalCount={pagination.total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </>
    );
  }

  if (!isInterceptorReady || loading) {
    return <ContestsTableSkeleton />;
  }

  return (
    <ContestsTable
      contests={contests}
      totalCount={pagination.total}
      page={page}
      rowsPerPage={rowsPerPage}
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
    />
  );
}
