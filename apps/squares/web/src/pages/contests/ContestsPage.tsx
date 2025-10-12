import { Box, CircularProgress, Typography } from '@mui/material';
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userObj = auth.user as any;
    const username =
      userObj?.profile?.preferred_username || userObj?.preferred_username || userObj?.sub || '';

    if (username) {
      dispatch(fetchContestsByUser(username));
    }
  }, [auth.isAuthenticated, auth.user, dispatch, isInterceptorReady]);

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
