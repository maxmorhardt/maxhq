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
import { selectCurrentSquare, selectSquareLoading } from '../../features/contests/contestSelectors';
import { updateSquare } from '../../features/contests/contestThunks';
import type { APIError } from '../../types/error';

interface EditSquareProps {
  open: boolean;
  onClose: () => void;
}

export default function EditSquare({ open, onClose }: EditSquareProps) {
  const dispatch = useAppDispatch();

  const currentSquare = useAppSelector(selectCurrentSquare);
  const loading = useAppSelector(selectSquareLoading);

  const [error, setError] = useState('');
  const [value, setValue] = useState(currentSquare?.value ?? '');

  useEffect(() => {
    setValue(currentSquare?.value ?? '');
    setError('');
  }, [currentSquare]);

  if (!currentSquare) {
    return;
  }

  const handleSave = async () => {
    try {
      await dispatch(updateSquare({ id: currentSquare.id, value: value })).unwrap();
      onClose();
    } catch (err: unknown) {
      const apiError = err as APIError;
      setError(apiError.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 20, fontWeight: 'bold' }}>Edit Square</DialogTitle>
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
