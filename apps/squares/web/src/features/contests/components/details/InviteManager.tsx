import { Close, Delete, ErrorOutlineOutlined, Link as LinkIcon, Share } from '@mui/icons-material';
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
import { useState } from 'react';
import type { Contest, Invite, ParticipantRole } from '../../../../types/contest';
import { isTerminalStatus } from '../../../../utils/contestStatus';
import { useToast } from '../../../toast/useToast';
import { useCreateInviteMutation, useDeleteInviteMutation, useGetInvitesQuery } from '../../api';

interface Props {
  open: boolean;
  onClose: () => void;
  contest: Contest;
}

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  p: 1,
  borderRadius: 1,
  backgroundColor: 'rgba(255,255,255,0.03)',
};

async function shareInviteLink(token: string, showToast: ReturnType<typeof useToast>['showToast']) {
  const url = `${window.location.origin}/join/${token}`;

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
    await navigator.share({ url });
  } catch {
    // the user closed the share sheet
  }
}

function describeInvite(invite: Invite) {
  const role =
    invite.role === 'viewer' ? invite.role : `${invite.maxSquares} sq/person · ${invite.role}`;
  const uses = invite.maxUses ? `${invite.uses}/${invite.maxUses} uses` : `${invite.uses} uses`;
  const expiry = invite.expiresAt
    ? ` · expires ${new Date(invite.expiresAt).toLocaleDateString()}`
    : '';
  return { role, usage: `${uses}${expiry}` };
}

export default function InviteManager({ open, onClose, contest }: Props) {
  const { showToast } = useToast();
  const { data: invites = [], isLoading } = useGetInvitesQuery(contest.id, { skip: !open });
  const [createInvite, { isLoading: creating, isError: createFailed }] = useCreateInviteMutation();
  const [deleteInvite] = useDeleteInviteMutation();

  const [maxSquares, setMaxSquares] = useState(10);
  const [role, setRole] = useState<ParticipantRole>('participant');
  const [maxUses, setMaxUses] = useState('');
  const [expiresIn, setExpiresIn] = useState('');
  const [failedInviteId, setFailedInviteId] = useState<string | null>(null);

  const isTerminal = isTerminalStatus(contest.status);

  const handleCreate = async () => {
    try {
      await createInvite({
        contestId: contest.id,
        request: {
          maxSquares: role === 'viewer' ? 0 : maxSquares,
          role,
          maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
          expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
        },
      }).unwrap();
    } catch {
      // the button turns into a retry
    }
  };

  const handleDelete = async (inviteId: string) => {
    setFailedInviteId(null);
    try {
      await deleteInvite({ contestId: contest.id, inviteId }).unwrap();
      showToast('Invite deleted', 'success');
    } catch {
      setFailedInviteId(inviteId);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Invite Links
        <IconButton
          aria-label="Close dialog"
          onClick={onClose}
          size="small"
          sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' } }}
        >
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {isTerminal ? (
            <Box sx={{ ...rowSx, p: 1.5, border: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                This contest is finished or deleted. Invite links can no longer be created or
                changed.
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* viewers never claim squares, so the limit only applies to participants */}
              {role !== 'viewer' && (
                <>
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.5 }}
                  >
                    Max Squares Per Person: {maxSquares}
                  </Typography>
                  <Slider
                    value={maxSquares}
                    onChange={(_, value) => setMaxSquares(value)}
                    min={1}
                    max={100}
                    valueLabelDisplay="auto"
                    size="small"
                  />
                </>
              )}

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
                color={createFailed ? 'error' : 'primary'}
                startIcon={
                  creating ? (
                    <CircularProgress size={16} />
                  ) : createFailed ? (
                    <ErrorOutlineOutlined />
                  ) : (
                    <LinkIcon />
                  )
                }
                onClick={handleCreate}
                disabled={creating}
                fullWidth
                sx={{ mt: 1.5 }}
              >
                {createFailed ? 'Failed, Retry' : 'Generate Invite Link'}
              </Button>
            </Box>
          )}

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            invites.length > 0 && (
              <>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Active Invite Links
                </Typography>
                {invites.map((invite) => {
                  const failed = failedInviteId === invite.id;
                  const { role: inviteRole, usage } = describeInvite(invite);

                  return (
                    <Box
                      key={invite.id}
                      sx={{
                        ...rowSx,
                        border: failed ? '1px solid #ff5d5d' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}
                        >
                          {inviteRole}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                          {usage}
                        </Typography>
                      </Box>
                      {!isTerminal && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                          <Tooltip title="Share link">
                            <IconButton
                              aria-label="Share link"
                              size="small"
                              onClick={() => shareInviteLink(invite.token, showToast)}
                              sx={{ color: 'rgba(255,255,255,0.6)' }}
                            >
                              <Share fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={failed ? 'Delete failed, retry' : 'Delete invite'}>
                            <IconButton
                              aria-label={failed ? 'Delete failed, retry' : 'Delete invite'}
                              size="small"
                              onClick={() => handleDelete(invite.id)}
                              sx={{
                                color: failed ? '#ff5d5d' : 'rgba(255,255,255,0.6)',
                                '&:hover': { color: '#ff5d5d' },
                              }}
                            >
                              {failed ? (
                                <ErrorOutlineOutlined fontSize="small" />
                              ) : (
                                <Delete fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </>
            )
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
