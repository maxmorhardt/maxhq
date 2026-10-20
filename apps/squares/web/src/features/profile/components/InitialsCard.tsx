import { Box, Button, Paper, TextField, Typography, useTheme } from '@mui/material';
import { useState } from 'react';
import { useToast } from '../../toast/useToast';
import { useUpdateMyProfileMutation } from '../api';

const MAX_INITIALS = 3;

// alphanumeric, uppercase, at most three characters, matching the backend rules
const normalizeInitials = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, MAX_INITIALS);

interface Props {
  initials: string | undefined;
  disabled: boolean;
}

export default function InitialsCard({ initials, disabled }: Props) {
  const theme = useTheme();
  const { showToast } = useToast();
  const [updateProfile, { isLoading: saving }] = useUpdateMyProfileMutation();
  const [draft, setDraft] = useState<string | null>(null);

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    try {
      await updateProfile({ defaultInitials: draft }).unwrap();
      showToast('Your initials have been updated', 'success');
      setDraft(null);
    } catch {
      showToast('Failed to update your initials. Please try again', 'error');
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2.5,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Default Initials
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Shown on every square you claim. Changing them updates your squares in active contests.
        </Typography>
      </Box>

      {draft !== null ? (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          <TextField
            size="small"
            label="Initials"
            value={draft}
            onChange={(e) => setDraft(normalizeInitials(e.target.value))}
            disabled={saving}
            sx={{ width: 110 }}
          />
          <Button variant="contained" onClick={handleSave} disabled={saving || !draft}>
            Save
          </Button>
          <Button color="inherit" onClick={() => setDraft(null)} disabled={saving}>
            Cancel
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexShrink: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 1 }}>
            {initials || '—'}
          </Typography>
          <Button variant="outlined" onClick={() => setDraft(initials ?? '')} disabled={disabled}>
            Edit
          </Button>
        </Box>
      )}
    </Paper>
  );
}
