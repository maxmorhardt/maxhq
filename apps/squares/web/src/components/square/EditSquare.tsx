import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { selectCurrentSquare, selectSquareLoading } from '../../features/contests/contestSelectors';

import { clearSquare, updateSquare } from '../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';

interface EditSquareProps {
  open: boolean;
  onClose: () => void;
}

export default function EditSquare({ open, onClose }: EditSquareProps) {
  const dispatch = useAppDispatch();
  const auth = useAuth();

  const currentSquare = useAppSelector(selectCurrentSquare);
  const loading = useAppSelector(selectSquareLoading);

  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (currentSquare?.value) {
      setValue(currentSquare.value);
    } else {
      const givenName = auth?.user?.profile?.given_name || '';
      const familyName = auth?.user?.profile?.family_name || '';
      const initials = (givenName.charAt(0) + familyName.charAt(0)).toUpperCase();
      setValue(initials);
    }
  }, [currentSquare, auth?.user?.profile?.given_name, auth?.user?.profile?.family_name]);

  if (!currentSquare) {
    return;
  }

  const handleSave = () => {
    if (!value.trim()) {
      setError(true);
      return;
    }

    if (currentSquare && auth?.user?.profile?.preferred_username) {
      setError(false);
      dispatch(
        updateSquare({
          id: currentSquare.id,
          value: value,
          owner: auth.user.profile.preferred_username,
        })
      );
      onClose();
    }
  };

  const handleClear = async () => {
    if (currentSquare) {
      try {
        await dispatch(clearSquare(currentSquare.id)).unwrap();
        onClose();
      } catch (error) {
        console.error('Failed to clear square:', error);
      }
    }
  };

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    if (error && event.target.value.trim()) {
      setError(false);
    }
  };

  const handleClose = () => {
    if (currentSquare?.value) {
      setValue(currentSquare.value);
    } else {
      const givenName = auth?.user?.profile?.given_name || '';
      const familyName = auth?.user?.profile?.family_name || '';
      const initials = (givenName.charAt(0) + familyName.charAt(0)).toUpperCase();
      setValue(initials);
    }

    setError(false);
    onClose();
  };

  const isOwner = currentSquare?.owner === auth?.user?.profile?.preferred_username;
  const isReadOnly = Boolean(currentSquare?.owner && !isOwner);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 20, fontWeight: 'bold' }}>Edit Square</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Initials"
          fullWidth
          variant="outlined"
          value={value}
          onChange={handleValueChange}
          error={error}
          disabled={isReadOnly}
        />

        {currentSquare?.owner && currentSquare.owner.trim() && (
          <Typography
            variant="body2"
            sx={{
              mt: 2,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            Owner: {currentSquare.owner}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>

        {currentSquare?.value && !isReadOnly && (
          <Button onClick={handleClear} disabled={loading} color="warning">
            Clear Square
          </Button>
        )}

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading || isReadOnly}
          sx={{ position: 'relative', minHeight: 37, minWidth: 100 }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
