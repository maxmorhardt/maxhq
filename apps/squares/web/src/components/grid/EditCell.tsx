import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectCellLoading, selectCurrentCell } from '../../features/grids/gridSelectors';
import { updateCell } from '../../features/grids/gridThunks';
import type { APIError } from '../../types/error';

interface EditCellProps {
  open: boolean;
  onClose: () => void;
}

export default function EditCell({ open, onClose }: EditCellProps) {
  const dispatch = useAppDispatch();

  const currentCell = useAppSelector(selectCurrentCell);
  const loading = useAppSelector(selectCellLoading);

  const [error, setError] = useState('');
  const [value, setValue] = useState(currentCell?.value || '');

  useEffect(() => {
    setValue(currentCell?.value || '');
    setError('');
  }, [currentCell]);

  if (!currentCell) {
    return;
  }

  const handleSave = async () => {
    if (!value.trim()) {
      setError('Cell value is required');
      return;
    }

    try {
      await dispatch(updateCell({ id: currentCell.id, value: value })).unwrap();
      onClose();
    } catch (err: unknown) {
      const apiError = err as APIError;
      setError(apiError.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 20, fontWeight: 'bold' }}>Edit Cell</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            autoFocus
            value={value}
            onChange={(e) => {
              const raw = e.target.value.toUpperCase();
              const filtered = raw.replace(/[^A-Z0-9]/g, '');
              setValue(filtered.slice(0, 3));
            }}
            fullWidth
            disabled={loading}
            slotProps={{
              input: {
                inputProps: { maxLength: 3 },
                style: { textAlign: 'center' },
              },
            }}
          />

          {error && (
            <Typography color="error" sx={{ fontSize: 12 }}>
              {error}
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
              sx={{ position: 'relative', minWidth: 100 }}
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
