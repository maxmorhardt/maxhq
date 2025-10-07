import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useAxiosAuth } from '../../axios/api';
import SquaresGrid from '../../components/grid/SquaresGrid';
import {
  selectCurrentGrid,
  selectGridError,
  selectGridLoading,
} from '../../features/grids/gridSelectors';
import { fetchGridById } from '../../features/grids/gridThunks';

export default function GridPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();
  const dispatch = useAppDispatch();

  const { id } = useParams<{ id: string }>();

  const loading = useAppSelector(selectGridLoading);
  const error = useAppSelector(selectGridError);
  const currentGrid = useAppSelector(selectCurrentGrid);

  useEffect(() => {
    if (auth.isAuthenticated && isInterceptorReady && id) {
      dispatch(fetchGridById(id));
    }
  }, [auth.isAuthenticated, isInterceptorReady, id, dispatch]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      </Box>
    );
  }

  if (!currentGrid) {
    return;
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        sx={{
          fontSize: { xs: '1rem', sm: '1.5rem', md: '2rem' },
          fontWeight: 700,
          mt: 1,
        }}
      >
        {currentGrid.name}
      </Typography>

      <SquaresGrid />
    </Box>
  );
}
