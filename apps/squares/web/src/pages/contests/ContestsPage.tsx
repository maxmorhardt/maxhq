import { Box, CircularProgress } from '@mui/material';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import ContestsTable from '../../components/contest/ContestsTable';
import {
  selectContestError,
  selectContestLoading,
  selectContests,
} from '../../features/contests/contestSelectors';
import { fetchContestsByUser } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';
import { useToast } from '../../hooks/useToast';

export default function ContestsPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const contests = useAppSelector(selectContests);
  const loading = useAppSelector(selectContestLoading);
  const error = useAppSelector(selectContestError);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  useEffect(() => {
    if (!auth.isAuthenticated || !isInterceptorReady) {
      return;
    }

    const username = auth.user?.profile?.preferred_username;
    if (username) {
      dispatch(fetchContestsByUser(username));
    }
  }, [auth.isAuthenticated, auth.user, dispatch, isInterceptorReady]);

  if (!isInterceptorReady || auth.isLoading || loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  return <ContestsTable contests={contests} />;
}
