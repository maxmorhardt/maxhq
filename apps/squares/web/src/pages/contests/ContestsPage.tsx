import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useAxiosAuth } from '../../axios/api';
import ContestsTable from '../../components/contest/ContestsTable';
import {
  selectContestError,
  selectContestLoading,
  selectContests,
} from '../../features/contests/contestSelectors';
import { fetchContestsByUser } from '../../features/contests/contestThunks';

export default function ContestsPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();
  const dispatch = useAppDispatch();

  const contests = useAppSelector(selectContests);
  const loading = useAppSelector(selectContestLoading);
  const error = useAppSelector(selectContestError);

  useEffect(() => {
    if (!auth.isAuthenticated || !isInterceptorReady) {
      return;
    }

    const user = auth.user?.profile?.preferred_username;
    if (!user) {
      return;
    }

    dispatch(fetchContestsByUser(user));
  }, [auth.isAuthenticated, auth.user?.profile?.preferred_username, dispatch, isInterceptorReady]);

  if (!isInterceptorReady || auth.isLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return <ContestsTable contests={contests} />;
}
