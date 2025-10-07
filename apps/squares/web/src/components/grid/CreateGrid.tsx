import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { selectGridError, selectGridLoading } from "../../features/grids/gridSelectors";
import { createGrid } from "../../features/grids/gridThunks";
import type { APIError } from "../../types/error";

interface CreateGridProps {
  open: boolean;
  onClose: (id: string) => void;
}

export default function CreateGrid({ open, onClose }: CreateGridProps) {
  const auth = useAuth();

  const dispatch = useAppDispatch();

  const loading = useAppSelector(selectGridLoading);
  const errorMessage = useAppSelector(selectGridError);

  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Grid name is required");
      return;
    }

    if (!auth.isAuthenticated || !auth.user) {
      setError("You must be logged in to create a grid");
      return;
    }

    setError("");

    try {
      const grid = await dispatch(createGrid(name)).unwrap();
      onClose(grid.id);
    } catch (err: unknown) {
      const apiError = err as APIError;
      setError(apiError.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 24, fontWeight: "bold" }}>Create New Grid</DialogTitle>
      <DialogContent>
        {!auth.isAuthenticated && (
          <Typography color="error" sx={{ mb: 2 }}>
            You must be logged in to create a grid
          </Typography>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          <TextField
            label="Grid Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
            disabled={loading}
          />

          {(error || errorMessage) && (
            <Typography color="error">{error || errorMessage}</Typography>
          )}

          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button onClick={() => onClose("")} sx={{ minWidth: 100 }} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={loading || !auth.isAuthenticated}
              sx={{ minWidth: 100, position: "relative" }}
            >
              {loading ? (
                <CircularProgress size={18} color="inherit" sx={{ marginRight: 1 }} />
              ) : (
                ""
              )}
              Create
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
