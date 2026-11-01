import { errorMessage } from '../../../api/errors';
import ConfirmDialog from '../../../components/feedback/ConfirmDialog';
import { useMe } from '../../profile/useMe';
import { useRemoveParticipantMutation } from '../api';

interface Props {
  contest: { id: string; name: string } | null;
  onClose: () => void;
  onLeft?: () => void;
  // the live page already knows the viewer from contests, so it doesn't need the profile
  viewerId?: string;
}

export default function LeaveContestDialog({ contest, onClose, onLeft, viewerId }: Props) {
  const me = useMe();
  const userId = viewerId ?? me.userId;
  const [removeParticipant, { isLoading, error, reset }] = useRemoveParticipantMutation();

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    if (!contest || !userId) {
      return;
    }

    try {
      await removeParticipant({ contestId: contest.id, userId }).unwrap();
      onLeft?.();
      handleClose();
    } catch {
      // the error renders in the dialog
    }
  };

  return (
    <ConfirmDialog
      open={!!contest}
      title="Leave Contest"
      confirmLabel="Leave"
      onConfirm={handleConfirm}
      onClose={handleClose}
      loading={isLoading}
      error={error ? errorMessage(error, 'Failed to leave the contest. Please try again.') : null}
    >
      Are you sure you want to leave <strong>{contest?.name}</strong>? You'll be removed from the
      contest and will need a new invite to rejoin.
    </ConfirmDialog>
  );
}
