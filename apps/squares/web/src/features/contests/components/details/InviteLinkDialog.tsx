import { Close, ContentCopy, Refresh, Share } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { errorMessage } from '../../../../api/errors';
import ConfirmDialog from '../../../../components/feedback/ConfirmDialog';
import type { Contest } from '../../../../types/contest';
import { isTerminalStatus } from '../../../../utils/contestStatus';
import { trackEvent } from '../../../../utils/faro';
import { useToast } from '../../../toast/useToast';
import { useGetInviteLinkQuery, useResetInviteLinkMutation } from '../../api';

interface Props {
  open: boolean;
  onClose: () => void;
  contest: Contest;
}

function inviteUrl(token: string) {
  return `${window.location.origin}/join/${token}`;
}

export default function InviteLinkDialog({ open, onClose, contest }: Props) {
  const { showToast } = useToast();
  const { data, isLoading, error } = useGetInviteLinkQuery(contest.id, { skip: !open });
  const [resetLink, reset] = useResetInviteLinkMutation();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const url = data ? inviteUrl(data.token) : '';
  const isTerminal = isTerminalStatus(contest.status);

  const copy = async () => {
    trackEvent('invite_share', { method: 'copy' });
    try {
      await navigator.clipboard.writeText(url);
      showToast('Invite link copied', 'success');
    } catch {
      showToast('Failed to copy link', 'error');
    }
  };

  const share = async () => {
    if (!navigator.share) {
      await copy();
      return;
    }
    trackEvent('invite_share', { method: 'share' });
    try {
      await navigator.share({ title: contest.name, url });
    } catch {
      // the user closed the share sheet
    }
  };

  const closeReset = () => {
    reset.reset();
    setConfirmingReset(false);
  };

  const handleReset = async () => {
    try {
      await resetLink(contest.id).unwrap();
      showToast('Invite link reset', 'success');
      closeReset();
    } catch {
      // the error renders in the dialog
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          Invite Link
          <IconButton aria-label="Close dialog" onClick={onClose} size="small">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
            {isTerminal ? (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                This contest is finished or deleted, so nobody new can join.
              </Typography>
            ) : (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Anyone with this link can join. They start with no squares, and you give them
                squares in Players.
              </Typography>
            )}

            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {error && (
              <Alert severity="error">{errorMessage(error, 'Could not load the link')}</Alert>
            )}

            {data && !isTerminal && (
              <>
                <TextField
                  value={url}
                  size="small"
                  fullWidth
                  slotProps={{ htmlInput: { readOnly: true, 'aria-label': 'Invite link' } }}
                  onFocus={(e) => e.target.select()}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" startIcon={<Share />} onClick={share} fullWidth>
                    Share Link
                  </Button>
                  <Button variant="outlined" startIcon={<ContentCopy />} onClick={copy} fullWidth>
                    Copy
                  </Button>
                </Box>
                <Button
                  color="warning"
                  size="small"
                  startIcon={<Refresh />}
                  onClick={() => setConfirmingReset(true)}
                  sx={{ justifySelf: 'start' }}
                >
                  Reset Link
                </Button>
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmingReset}
        title="Reset Invite Link"
        confirmLabel="Reset"
        onConfirm={handleReset}
        onClose={closeReset}
        loading={reset.isLoading}
        error={reset.error ? errorMessage(reset.error, 'Failed to reset the link') : null}
      >
        The current link stops working right away. Everyone who already joined stays in, and you
        share the new link with anyone else.
      </ConfirmDialog>
    </>
  );
}
