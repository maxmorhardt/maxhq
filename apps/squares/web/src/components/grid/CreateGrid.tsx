import { Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useAuth } from "react-oidc-context";

interface CreateGridProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string) => void
  loading?: boolean
  errorMessage?: string
}

export default function CreateGrid({
  open,
  onClose,
  onCreate,
  loading = false,
  errorMessage,
}: CreateGridProps) {
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

    setError("");
    onCreate(gridName.trim());
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
            value={gridName}
            onChange={(e) => setGridName(e.target.value)}
            fullWidth
            autoFocus
            disabled={loading}
          />

          {(error || errorMessage) && (
            <Typography color="error">
              {error || errorMessage}
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
              {loading ? <CircularProgress size={18} color="inherit" sx={{ marginRight: 1 }} /> : ""}
							Create
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}