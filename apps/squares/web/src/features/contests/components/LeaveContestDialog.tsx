import { useAuth } from 'react-oidc-context';
import { errorMessage } from '../../../api/errors';
import ConfirmDialog from '../../../components/feedback/ConfirmDialog';
import { useRemoveParticipantMutation } from '../api';

interface Props {
  contest: { id: string; name: string } | null;
  onClose: () => void;
  onLeft?: () => void;
}

export default function LeaveContestDialog({ contest, onClose, onLeft }: Props) {
  const email = useAuth().user?.profile?.email;
  const [removeParticipant, { isLoading, error, reset }] = useRemoveParticipantMutation();

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    if (!contest || !email) {
      return;
    }

    try {
      await removeParticipant({ contestId: contest.id, userId: email }).unwrap();
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
