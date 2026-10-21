import { Box, Button, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import { fonts, game as palette } from '../../../app/theme';
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

  const shown = draft ?? initials;

  // laid out for the narrow ID card: the square and its note, then the controls under them
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* a preview of how a claimed square reads on the board */}
        <Box
          sx={{
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            width: 64,
            height: 64,
            borderRadius: '12px',
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: '1.5rem',
            letterSpacing: '0.04em',
            color: shown ? palette.chalk : 'text.secondary',
            bgcolor: shown ? alpha(palette.brand, 0.28) : alpha(palette.chalk, 0.04),
            border: 1,
            borderColor: shown ? alpha(palette.brand, 0.6) : 'divider',
            borderStyle: shown ? 'solid' : 'dashed',
          }}
        >
          {shown || '—'}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>Default Initials</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Shown on every square you claim. Changing them updates your squares in active contests.
          </Typography>
        </Box>
      </Box>

      {draft !== null ? (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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
        <Button
          variant="outlined"
          fullWidth
          onClick={() => setDraft(initials ?? '')}
          disabled={disabled}
        >
          Edit
        </Button>
      )}
    </Box>
  );
}
