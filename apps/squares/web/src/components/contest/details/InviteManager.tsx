import { Close, Delete, Link as LinkIcon, Share } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  selectCurrentContest,
  selectInvites,
  selectInvitesLoading,
} from '../../../features/contests/contestSelectors';
import {
  createContestInvite,
  deleteContestInvite,
  fetchInvites,
} from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';
import type { ParticipantRole } from '../../../types/contest';

interface InviteManagerProps {
  open: boolean;
  onClose: () => void;
}

export default function InviteManager({ open, onClose }: InviteManagerProps) {
  const dispatch = useAppDispatch();
  const currentContest = useAppSelector(selectCurrentContest);
  const invites = useAppSelector(selectInvites);
  const loading = useAppSelector(selectInvitesLoading);
  const { showToast } = useToast();

  const [maxSquares, setMaxSquares] = useState<number>(10);
  const [role, setRole] = useState<ParticipantRole>('participant');
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<string>('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open && currentContest?.id) {
      dispatch(fetchInvites(currentContest.id));
    }
  }, [open, currentContest?.id, dispatch]);

  const handleCreateInvite = async () => {
    if (!currentContest) return;
    setCreating(true);
    try {
      const result = await dispatch(
        createContestInvite({
          contestId: currentContest.id,
          request: {
            maxSquares,
            role,
            maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
            expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
          },
        })
      ).unwrap();

      const inviteUrl = result.inviteUrl || `${window.location.origin}/join/${result.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      showToast('Invite link copied to clipboard', 'success');
      // refetch invites list since create only returns token/url
      dispatch(fetchInvites(currentContest.id));
    } catch {
      showToast('Failed to create invite', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!currentContest) return;
    try {
      await dispatch(deleteContestInvite({ contestId: currentContest.id, inviteId })).unwrap();
      showToast('Invite deleted', 'success');
    } catch {
      showToast('Failed to delete invite', 'error');
    }
  };

  const handleShareLink = async (token: string) => {
    const url = `${window.location.origin}/join/${token}`;
    const contestName = currentContest?.name || '';

    if (!navigator.share) {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Invite link copied to clipboard', 'success');
      } catch {
        showToast('Failed to copy link', 'error');
      }
      return;
    }

    try {
      await navigator.share({
        title: contestName,
        text: `Join my squares contest: ${contestName || 'Contest'}`,
        url,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Invite Links
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' } }}
        >
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* create invite form */}
          <Box>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.5 }}
            >
              Max Squares Per Person: {maxSquares}
            </Typography>
            <Slider
              value={maxSquares}
              onChange={(_, val) => setMaxSquares(val as number)}
              min={1}
              max={100}
              valueLabelDisplay="auto"
              size="small"
            />

            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                label="Role"
                onChange={(e) => setRole(e.target.value as ParticipantRole)}
              >
                <MenuItem value="participant">Participant</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <TextField
                label="Max Uses (optional)"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                size="small"
                fullWidth
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <TextField
                label="Expires In (min)"
                type="number"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                size="small"
                fullWidth
                slotProps={{ htmlInput: { min: 1 } }}
              />
            </Box>

            <Button
              variant="contained"
              startIcon={creating ? <CircularProgress size={16} /> : <LinkIcon />}
              onClick={handleCreateInvite}
              disabled={creating}
              fullWidth
              sx={{ mt: 1.5 }}
            >
              Generate Invite Link
            </Button>
          </Box>

          {/* active invites list */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : invites.length > 0 ? (
            <>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Active Invite Links
              </Typography>
              {invites.map((invite) => (
                <Box
                  key={invite.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}
                    >
                      {invite.maxSquares} sq/person · {invite.role}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      {invite.maxUses
                        ? `${invite.uses}/${invite.maxUses} uses`
                        : `${invite.uses} uses`}
                      {invite.expiresAt &&
                        ` · expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    <Tooltip title="Share link">
                      <IconButton
                        size="small"
                        onClick={() => handleShareLink(invite.token)}
                        sx={{ color: 'rgba(255,255,255,0.6)' }}
                      >
                        <Share fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete invite">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteInvite(invite.id)}
                        sx={{
                          color: 'rgba(255,255,255,0.6)',
                          '&:hover': { color: '#ff4444' },
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </>
          ) : null}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
