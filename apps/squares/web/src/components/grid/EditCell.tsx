import { Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { useState, useEffect } from "react";

interface EditCellProps {
  open: boolean
  value: string
  onChange: (val: string) => void
  onClose: () => void
  onSave: () => void
  loading?: boolean
  errorMessage?: string
}

export default function EditCell({
  open,
  value,
  onChange,
  onClose,
  onSave,
  loading = false,
  errorMessage,
}: EditCellProps) {
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
  }, [open, value, errorMessage]);

  const handleSave = () => {
    if (!value.trim()) {
      setError("Cell value is required");
      return;
    }

    setError("");
    onSave();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 20, fontWeight: "bold" }}>Edit Cell</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            autoFocus
            value={value}
            onChange={e => {
              const raw = e.target.value.toUpperCase();
              const filtered = raw.replace(/[^A-Z0-9]/g, "");
              onChange(filtered.slice(0, 3));
            }}
            fullWidth
            disabled={loading}
            slotProps={{
							input: {
								inputProps: { maxLength: 3 },
								style: { textAlign: "center" },
							},
						}}
          />

          {(error || errorMessage) && (
            <Typography color="error" sx={{ fontSize: 12 }}>
              {error || errorMessage}
            </Typography>
          )}

          <Box display="flex" justifyContent="flex-end" gap={2} mt={1}>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
              sx={{ position: "relative", minWidth: 100 }}
            >
              {loading && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
              Save
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
