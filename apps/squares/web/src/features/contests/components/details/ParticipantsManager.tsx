import { Close, Edit, Logout } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { errorMessage } from '../../../../api/errors';
import ConfirmDialog from '../../../../components/feedback/ConfirmDialog';
import { blockNonIntegerKeys, noNumberSpinners } from '../../../../components/inputs';
import type { Contest, Participant, ParticipantRole } from '../../../../types/contest';
import { isTerminalStatus } from '../../../../utils/contestStatus';
import { useToast } from '../../../toast/useToast';
import {
  useAllotSquaresMutation,
  useGetBansQuery,
  useRemoveParticipantMutation,
  useUnbanParticipantMutation,
} from '../../api';
import type { ContestViewer } from '../../live/viewer';
import LeaveContestDialog from '../LeaveContestDialog';
import EditParticipantDialog from './EditParticipantDialog';

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
};

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
  p: 1,
  borderRadius: 1,
  backgroundColor: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const actionSx = { color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#ff5d5d' } };

const sectionLabelSx = { color: 'text.secondary', fontSize: '0.8rem', fontWeight: 600 };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function ParticipantsManager({
  open,
  onClose,
  contest,
  participants,
  viewer,
}: Props) {
  const { showToast } = useToast();
  const [removeParticipant, removal] = useRemoveParticipantMutation();
  const [allotSquares, allotment] = useAllotSquaresMutation();
  const [unban, unbanning] = useUnbanParticipantMutation();

  const [editing, setEditing] = useState<Participant | null>(null);
  const [removing, setRemoving] = useState<Participant | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [allotCount, setAllotCount] = useState<number | null>(null);

  // owners edit only before kickoff, but can remove anyone until the contest is final
  const isOpen = !isTerminalStatus(contest.status);
  const canManage = viewer.isOwner && isOpen;
  const canEdit = viewer.isOwner && contest.status === 'ACTIVE';

  const { data: bans = [] } = useGetBansQuery(contest.id, { skip: !open || !canManage });

  const totalSquares = contest.squares.length;
  const claimedBy = (userId: string) => contest.squares.filter((s) => s.owner === userId).length;
  const claimed = contest.squares.filter((s) => s.value.trim() !== '').length;
  const allocated = participants.reduce((sum, p) => sum + p.maxSquares, 0);
  const unallocated = Math.max(0, totalSquares - allocated);
  const waiting = participants.filter((p) => p.role === 'participant' && p.maxSquares === 0);
  const fairShare = waiting.length ? Math.floor(unallocated / waiting.length) : 0;
  const count = Math.min(Math.max(allotCount ?? Math.min(5, fairShare), 1), Math.max(fairShare, 1));

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

  const handleAllot = async () => {
    try {
      const given = await allotSquares({ contestId: contest.id, maxSquares: count }).unwrap();
      showToast(
        `Gave ${plural(count, 'square')} to ${plural(given.length, 'participant')}`,
        'success'
      );
      setAllotCount(null);
    } catch (err) {
      showToast(errorMessage(err, 'Could not give out squares'), 'error');
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      await unban({ contestId: contest.id, userId }).unwrap();
      showToast('They can join again with the invite link', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not unban'), 'error');
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
            {viewer.isOwner && (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                Given out {allocated}/{totalSquares} · Claimed {claimed}
              </Typography>
            )}

            {canEdit && waiting.length > 0 && (
              <Box sx={{ ...rowSx, flexWrap: 'wrap', borderColor: 'primary.main' }}>
                <Typography sx={{ fontSize: '0.85rem', flex: '1 1 200px' }}>
                  {plural(waiting.length, 'participant')} {waiting.length === 1 ? 'has' : 'have'} no
                  squares yet.
                  {fairShare === 0 && ' Lower someone’s squares to make room first.'}
                </Typography>
                {fairShare > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      type="number"
                      size="small"
                      value={count}
                      onKeyDown={blockNonIntegerKeys}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        setAllotCount(isNaN(parsed) ? 1 : parsed);
                      }}
                      slotProps={{ htmlInput: { 'aria-label': 'Squares each' } }}
                      sx={{ width: 72, '& input': { textAlign: 'center' }, ...noNumberSpinners }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleAllot}
                      disabled={allotment.isLoading}
                    >
                      Give Each
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {participants.map((participant) => {
              const held = claimedBy(participant.userId);
              const noSquares = participant.role !== 'owner' && participant.maxSquares === 0;
              return (
                <Box key={participant.id} sx={rowSx}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}
                      >
                        {viewer.isMe(participant.userId) ? 'You' : participant.displayName}
                      </Typography>
                      <Chip
                        label={participant.role}
                        size="small"
                        sx={{
                          bgcolor: roleColor[participant.role],
                          color: '#000',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          height: 20,
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                    </Box>
                    {viewer.fullName(participant.userId) && (
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{ display: 'block', color: 'rgba(255,255,255,0.5)' }}
                      >
                        {viewer.fullName(participant.userId)}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      {noSquares ? 'No squares yet' : `${held}/${participant.maxSquares} squares`}
                    </Typography>
                  </Box>

                  {canManage && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      {canEdit && (
                        <Tooltip title="Edit squares">
                          <IconButton
                            aria-label={`Edit ${participant.displayName}`}
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
                            aria-label={`Remove ${participant.displayName}`}
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
                  {isOpen && viewer.isMe(participant.userId) && participant.role !== 'owner' && (
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
              );
            })}

            {participants.length === 0 && (
              <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 2 }}
              >
                No participants yet
              </Typography>
            )}

            {canManage && bans.length > 0 && (
              <>
                <Typography sx={{ ...sectionLabelSx, mt: 1.5 }}>Banned</Typography>
                {bans.map((ban) => (
                  <Box key={ban.userId} sx={rowSx}>
                    <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                      {ban.displayName || 'Unnamed participant'}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => handleUnban(ban.userId)}
                      disabled={unbanning.isLoading}
                      aria-label={`Unban ${ban.displayName || 'participant'}`}
                    >
                      Unban
                    </Button>
                  </Box>
                ))}
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <EditParticipantDialog
        contestId={contest.id}
        participant={editing}
        claimed={editing ? claimedBy(editing.userId) : 0}
        maxAllowed={editing ? Math.min(totalSquares, editing.maxSquares + unallocated) : 0}
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
        Remove <strong>{removing?.displayName}</strong>? They lose their squares and can&apos;t
        rejoin with the invite link until you unban them.
      </ConfirmDialog>

      {/* leaving closes the whole manager */}
      <LeaveContestDialog
        contest={leaving ? contest : null}
        onClose={() => setLeaving(false)}
        onLeft={onClose}
        userId={viewer.viewerId}
      />
    </>
  );
}
