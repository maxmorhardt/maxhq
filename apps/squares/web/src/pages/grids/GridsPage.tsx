import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useAxiosAuth } from "../../hooks/useAxiosAuth";
import { getGridsByUser } from "../../service/gridService";
import type { APIError } from "../../types/error";
import type { Grid } from '../../types/grid';
import GridsTable from '../../components/grid/GridTable';

export default function GridsPage() {
  const auth = useAuth();
  const isInterceptorReady = useAxiosAuth();

  const [grids, setGrids] = useState<Grid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // ✅ Wait until both OIDC and interceptor are ready
    if (!auth.isAuthenticated || !isInterceptorReady) return;

    const fetchGrids = async () => {
      setLoading(true);
      try {
        const username = auth.user?.profile?.preferred_username;
        if (!username) {
          setError("User not found");
          return;
        }

        const res = await getGridsByUser(username);
        setGrids(res);
        setError("");
      } catch (err: unknown) {
        const apiError = err as APIError;
        console.error("Failed to fetch grids:", apiError);
        setError(apiError.message || "Failed to fetch grids");
      } finally {
        setLoading(false);
      }
    };

    fetchGrids();
  }, [auth.isAuthenticated, auth.user?.profile?.preferred_username, isInterceptorReady]);

  // ✅ Show loading until both OIDC and interceptor are ready
  if (!isInterceptorReady || auth.isLoading || loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
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
