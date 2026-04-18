import { Close, Edit } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  selectCurrentContest,
  selectParticipants,
  selectParticipantsLoading,
} from '../../../features/contests/contestSelectors';
import {
  fetchParticipants,
  removeContestParticipant,
  updateContestParticipant,
} from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';
import type { Participant, ParticipantRole } from '../../../types/contest';

interface ParticipantsManagerProps {
  open: boolean;
  onClose: () => void;
  isOwner?: boolean;
}

export default function ParticipantsManager({
  open,
  onClose,
  isOwner = false,
}: ParticipantsManagerProps) {
  const dispatch = useAppDispatch();
  const currentContest = useAppSelector(selectCurrentContest);
  const participants = useAppSelector(selectParticipants);
  const loading = useAppSelector(selectParticipantsLoading);
  const { showToast } = useToast();

  const [editParticipant, setEditParticipant] = useState<Participant | null>(null);
  const [editRole, setEditRole] = useState<ParticipantRole>('participant');
  const [editMaxSquares, setEditMaxSquares] = useState<number>(10);
  const [removeConfirm, setRemoveConfirm] = useState<Participant | null>(null);

  useEffect(() => {
    if (open && currentContest?.id) {
      dispatch(fetchParticipants(currentContest.id));
    }
  }, [open, currentContest?.id, dispatch]);

  const handleEditOpen = (participant: Participant) => {
    setEditParticipant(participant);
    setEditRole(participant.role);
    setEditMaxSquares(participant.maxSquares);
  };

  const handleEditSave = async () => {
    if (!currentContest || !editParticipant) {
      return;
    }

    await dispatch(
      updateContestParticipant({
        contestId: currentContest.id,
        userId: editParticipant.userId,
        request: { role: editRole, maxSquares: editMaxSquares },
      })
    ).unwrap();
    showToast('Participant updated', 'success');
    setEditParticipant(null);
  };

  const handleRemove = async () => {
    if (!currentContest || !removeConfirm) {
      return;
    }

    await dispatch(
      removeContestParticipant({
        contestId: currentContest.id,
        userId: removeConfirm.userId,
      })
    ).unwrap();
    showToast('Participant removed', 'success');
    setRemoveConfirm(null);
  };

  const getRoleColor = (role: ParticipantRole) => {
    switch (role) {
      case 'owner':
        return '#ffd700';
      case 'participant':
        return '#4facfe';
      case 'viewer':
        return 'rgba(255,255,255,0.4)';
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          Participants
          <IconButton
            onClick={onClose}
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
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {participants.map((participant) => (
                <Box
                  key={participant.id}
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
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(255,255,255,0.85)',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {participant.userId}
                      </Typography>
                      <Chip
                        label={participant.role}
                        size="small"
                        sx={{
                          bgcolor: getRoleColor(participant.role),
                          color: participant.role === 'viewer' ? 'white' : '#000',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          height: 20,
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      max {participant.maxSquares} squares
                    </Typography>
                  </Box>

                  {isOwner &&
                    participant.role !== 'owner' &&
                    currentContest?.status === 'ACTIVE' && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditOpen(participant)}
                            sx={{ color: 'rgba(255,255,255,0.6)' }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove">
                          <IconButton
                            size="small"
                            onClick={() => setRemoveConfirm(participant)}
                            sx={{
                              color: 'rgba(255,255,255,0.6)',
                              '&:hover': { color: '#ff4444' },
                            }}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                </Box>
              ))}

              {participants.length === 0 && (
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 2 }}
                >
                  No participants yet
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* edit participant dialog */}
      <Dialog
        open={!!editParticipant}
        onClose={() => setEditParticipant(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pr: 6 }}>
          Edit Participant
          <IconButton
            onClick={() => setEditParticipant(null)}
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
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>
            {editParticipant?.userId}
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={editRole}
              label="Role"
              onChange={(e) => setEditRole(e.target.value as ParticipantRole)}
            >
              <MenuItem value="participant">Participant</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.5 }}>
            Max Squares: {editMaxSquares}
          </Typography>
          <Slider
            value={editMaxSquares}
            onChange={(_, val) => setEditMaxSquares(val as number)}
            min={1}
            max={100}
            valueLabelDisplay="auto"
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditParticipant(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* remove participant confirm dialog */}
      <Dialog open={!!removeConfirm} onClose={() => setRemoveConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          Remove Participant
          <IconButton
            onClick={() => setRemoveConfirm(null)}
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
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Are you sure you want to remove <strong>{removeConfirm?.userId}</strong>? Their claimed
            squares will be cleared.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRemove}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
