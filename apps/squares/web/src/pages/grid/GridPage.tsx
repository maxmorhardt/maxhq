import { Box, CircularProgress, Paper, Typography } from '@mui/material';
import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useParams } from "react-router-dom";
import { getGridById } from "../../service/gridService";
import type { APIError } from "../../types/error";
import type { Grid } from '../../types/grid';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';

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
    <Box mt={4} mx={2}>
      <Typography variant="h4" gutterBottom>
        Grid: {grid.id}
      </Typography>

      <Box display="grid" gridTemplateColumns={`repeat(${grid.data[0].length}, 40px)`} gap={1}>
        {grid.data.flat().map((cell: string, index: number) => (
          <Paper
            key={index}
            sx={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: cell ? "primary.main" : "grey.300",
            }}
          >
            {cell}
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
