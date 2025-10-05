import { Box, Button, Dialog, DialogContent, DialogTitle, TextField, Typography, CircularProgress } from "@mui/material";
import { useState } from "react";
import { useAuth } from "react-oidc-context";

interface CreateGridProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  loading?: boolean;
}

export default function CreateGrid({ open, onClose, onCreate, loading = false }: CreateGridProps) {
  const auth = useAuth();
  const [gridName, setGridName] = useState("");
  const [error, setError] = useState("");

  const handleCreate = () => {
    if (!gridName.trim()) {
      setError("Grid name is required");
      return;
    }

    if (!auth.isAuthenticated || !auth.user) {
      setError("You must be logged in to create a grid");
      return;
    }

    onCreate(gridName.trim());
    setGridName("");
    setError("");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 24, fontWeight: "bold" }}>Create New Grid</DialogTitle>
      <DialogContent>
        {!auth.isAuthenticated && (
          <Typography color="error" sx={{ mb: 2 }}>
            You must be logged in to create a grid.
          </Typography>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          <TextField
            label="Grid Name"
            value={gridName}
            onChange={e => setGridName(e.target.value)}
            fullWidth
            autoFocus
            disabled={loading}
          />

          {error && (
            <Typography color="error">
              {error}
            </Typography>
          )}

          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button onClick={onClose} sx={{ minWidth: 100 }} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={loading || !auth.isAuthenticated}
              sx={{ minWidth: 100, position: "relative" }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Create"}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}