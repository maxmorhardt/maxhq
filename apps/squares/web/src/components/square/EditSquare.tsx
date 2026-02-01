import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useState, type ChangeEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import {
  selectCurrentContest,
  selectCurrentSquare,
  selectSquareLoading,
} from '../../features/contests/contestSelectors';

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
  const currentContest = useAppSelector(selectCurrentContest);
  const loading = useAppSelector(selectSquareLoading);

  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  // helper function to extract initials from name
  const getInitials = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) {
      return '';
    }

    const splitName = trimmed.split(/\s+/);
    let initials = '';
    for (let i = 0; i < splitName.length && initials.length < 3; i++) {
      initials += splitName[i].charAt(0).toUpperCase();
    }

    return initials;
  };

  // initialize with existing value or user's initials
  useEffect(() => {
    if (currentSquare?.value) {
      setValue(currentSquare.value);
      return;
    }

    const name = auth.user?.profile?.name || '';
    setValue(getInitials(name));
  }, [currentSquare, auth.user?.profile?.name]);

  if (!currentSquare) {
    return;
  }

  // validate and dispatch update action
  const handleSave = () => {
    if (!value.trim()) {
      setError(true);
      return;
    }

    if (currentSquare && auth?.user?.profile?.preferred_username) {
      setError(false);
      dispatch(
        updateSquare({
          contestId: currentSquare.contestId,
          squareId: currentSquare.id,
          value: value,
          owner: auth.user.profile.preferred_username,
        })
      );
      onClose();
    }
  };

  // dispatch clear action and close modal
  const handleClear = async () => {
    if (currentSquare) {
      try {
        await dispatch(
          clearSquare({
            contestId: currentSquare.contestId,
            squareId: currentSquare.id,
          })
        ).unwrap();
        onClose();
      } catch (error) {
        console.error('Failed to clear square:', error);
      }
    }
  };

  // update value and clear error if valid
  const handleValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value;

    // filter to only alphanumeric characters, convert to uppercase, limit to 3 chars
    const filtered = input
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 3);

    setValue(filtered);
    if (error && filtered.trim()) {
      setError(false);
    }
  };

  // reset form to original values on close
  const handleClose = () => {
    if (currentSquare?.value) {
      setValue(currentSquare.value);
    } else {
      const name = auth?.user?.profile?.name || '';
      setValue(getInitials(name));
    }

    setError(false);
    onClose();
  };

  // check ownership and contest state
  const isOwner = currentSquare?.owner === auth?.user?.profile?.preferred_username;
  const isReadOnly = Boolean(currentSquare?.owner && !isOwner);
  const isActive = currentContest?.status === 'ACTIVE';

  // get all quarters where this square is a winner
  const winningQuarters =
    currentContest?.quarterResults
      ?.filter((qr) => qr.winnerRow === currentSquare?.row && qr.winnerCol === currentSquare?.col)
      .map((qr) => qr.quarter)
      .sort((a, b) => a - b) ?? [];

  const isWinner = winningQuarters.length > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      {/* dialog title with close button */}
      <DialogTitle sx={{ fontSize: 20, fontWeight: 'bold', pr: 6 }}>
        Edit Square
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      {/* form content with input, owner, and winner info */}
      <DialogContent>
        {/* initials input form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <TextField
            autoFocus
            margin="dense"
            label="Initials"
            fullWidth
            variant="outlined"
            value={value}
            onChange={handleValueChange}
            error={error}
            disabled={isReadOnly || !isActive}
          />
        </form>

        {/* display square owner's full name */}
        {currentSquare?.owner && currentSquare.owner.trim() && (
          <Typography
            variant="body2"
            sx={{
              mt: 2,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            Owner: {currentSquare.ownerName}
          </Typography>
        )}

        {/* display winner badge if square won any quarters */}
        {isWinner && (
          <Typography
            variant="body2"
            sx={{
              mt: 1,
              color: 'rgba(67, 233, 123, 0.9)',
              fontWeight: 'bold',
              fontSize: { xs: '0.8rem', md: '0.9rem' },
            }}
          >
            🏆 Winner: {winningQuarters.map((q) => `Quarter ${q}`).join(', ')}
          </Typography>
        )}
      </DialogContent>
      {/* clear and save buttons (only shown in active state) */}
      <DialogActions>
        {isActive && currentSquare?.value && !isReadOnly && (
          <Button onClick={handleClear} disabled={loading} color="warning">
            Clear Square
          </Button>
        )}

        {isActive && (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading || isReadOnly}
            sx={{ position: 'relative', minHeight: 37, minWidth: 100 }}
          >
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
