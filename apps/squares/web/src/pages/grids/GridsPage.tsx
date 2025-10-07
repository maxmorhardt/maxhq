import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useAxiosAuth } from '../../axios/api';
import GridsTable from '../../components/grid/GridTable';
import {
  selectGridError,
  selectGridLoading,
  selectGrids,
} from '../../features/grids/gridSelectors';
import { fetchGridsByUser } from '../../features/grids/gridThunks';

export default function GridsPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();
  const dispatch = useAppDispatch();

  const grids = useAppSelector(selectGrids);
  const loading = useAppSelector(selectGridLoading);
  const error = useAppSelector(selectGridError);

  useEffect(() => {
    if (!auth.isAuthenticated || !isInterceptorReady) {
      return;
    }

    const user = auth.user?.profile?.preferred_username;
    if (!user) {
      return;
    }

    dispatch(fetchGridsByUser(user));
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

  return <GridsTable grids={grids} />;
}
