import { Close, Edit, Logout } from '@mui/icons-material';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { errorMessage } from '../../../../api/errors';
import ConfirmDialog from '../../../../components/feedback/ConfirmDialog';
import type { Contest, Participant, ParticipantRole } from '../../../../types/contest';
import { isTerminalStatus } from '../../../../utils/contestStatus';
import { useToast } from '../../../toast/useToast';
import { useRemoveParticipantMutation } from '../../api';
import type { ContestViewer } from '../../live/viewer';
import LeaveContestDialog from '../LeaveContestDialog';
import EditParticipantDialog from './EditParticipantDialog';
import { participantName } from '../../../../utils/publicName';

interface Props {
  open: boolean;
  onClose: () => void;
  contest: Contest;
  participants: Participant[];
  viewer: ContestViewer;
}

const roleColor: Record<ParticipantRole, string> = {
  owner: '#f7c948',
  participant: '#5aa9ff',
  viewer: 'rgba(255,255,255,0.4)',
};

const actionSx = { color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#ff5d5d' } };

export default function ParticipantsManager({
  open,
  onClose,
  contest,
  participants,
  viewer,
}: Props) {
  const { showToast } = useToast();
  const [removeParticipant, removal] = useRemoveParticipantMutation();

  const [editing, setEditing] = useState<Participant | null>(null);
  const [removing, setRemoving] = useState<Participant | null>(null);
  const [leaving, setLeaving] = useState(false);

  // owners edit only before kickoff, but can remove anyone until the contest is final
  const isOpen = !isTerminalStatus(contest.status);
  const canManage = viewer.isOwner && isOpen;

  const closeRemove = () => {
    removal.reset();
    setRemoving(null);
  };

  const handleRemove = async () => {
    if (!removing) {
      return;
    }
    try {
      await removeParticipant({ contestId: contest.id, userId: removing.userId }).unwrap();
      showToast('Participant removed', 'success');
      closeRemove();
    } catch {
      // the error renders in the dialog
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          Participants
          <IconButton
            aria-label="Close dialog"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
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
                      noWrap
                      sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}
                    >
                      {participant.userId === viewer.email ? 'You' : participantName(participant)}
                    </Typography>
                    <Chip
                      label={participant.role}
                      size="small"
                      sx={{
                        bgcolor: roleColor[participant.role],
                        color: participant.role === 'viewer' ? 'white' : '#000',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        height: 20,
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  </Box>
                  {/* the owner invites and removes people, so only they see who each player is */}
                  {viewer.isOwner && (
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{ display: 'block', color: 'rgba(255,255,255,0.5)' }}
                    >
                      {participant.userId}
                    </Typography>
                  )}
                  {/* viewers never hold squares, so there is no count to show */}
                  {participant.role !== 'viewer' && (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      max {participant.maxSquares} squares
                    </Typography>
                  )}
                </Box>

                {canManage && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    {contest.status === 'ACTIVE' && (
                      <Tooltip title="Edit">
                        <IconButton
                          aria-label={`Edit ${participant.userId}`}
                          size="small"
                          onClick={() => setEditing(participant)}
                          sx={{ color: 'rgba(255,255,255,0.6)' }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {participant.role !== 'owner' && (
                      <Tooltip title="Remove">
                        <IconButton
                          aria-label={`Remove ${participant.userId}`}
                          size="small"
                          onClick={() => setRemoving(participant)}
                          sx={actionSx}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                )}

                {/* anyone but the owner can leave until the contest is final */}
                {isOpen && participant.userId === viewer.email && participant.role !== 'owner' && (
                  <Tooltip title="Leave contest">
                    <IconButton
                      aria-label="Leave contest"
                      size="small"
                      onClick={() => setLeaving(true)}
                      sx={{ ...actionSx, flexShrink: 0 }}
                    >
                      <Logout fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
        </DialogContent>
      </Dialog>

      <EditParticipantDialog
        contestId={contest.id}
        participant={editing}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={!!removing}
        title="Remove Participant"
        confirmLabel="Remove"
        onConfirm={handleRemove}
        onClose={closeRemove}
        loading={removal.isLoading}
        error={removal.error ? errorMessage(removal.error, 'Failed to remove participant') : null}
      >
        Are you sure you want to remove <strong>{removing ? participantName(removing) : ''}</strong>
        ? They'll be removed from the contest and will need a new invite to rejoin.
      </ConfirmDialog>

      {/* leaving closes the whole manager */}
      <LeaveContestDialog
        contest={leaving ? contest : null}
        onClose={() => setLeaving(false)}
        onLeft={onClose}
      />
    </>
  );
}
