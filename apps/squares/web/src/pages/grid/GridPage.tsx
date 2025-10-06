import { Box, CircularProgress, Typography } from '@mui/material';
import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useParams } from "react-router-dom";
import SquaresGrid from '../../components/grid/SquaresGrid';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';
import { getGridById } from "../../service/gridService";
import type { APIError } from "../../types/error";
import type { Grid } from '../../types/grid';

export default function GridPage() {
  const auth = useAuth();

	const isInterceptorReady = useAxiosAuth();

  const { id } = useParams<{ id: string }>();

  const [grid, setGrid] = useState<Grid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.isAuthenticated || !isInterceptorReady || !id) {
			return;
		}

    const fetchGrid = async () => {
      setLoading(true);
      try {
        const data = await getGridById(id);
        setGrid(data);
      } catch (err: unknown) {
        const apiError = err as APIError;
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGrid();
  }, [auth.isAuthenticated, isInterceptorReady, id]);

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

  if (!grid) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <Typography>No grid data found</Typography>
      </Box>
    );
  }

  return (
    <SquaresGrid grid={grid}/>
  );
}
