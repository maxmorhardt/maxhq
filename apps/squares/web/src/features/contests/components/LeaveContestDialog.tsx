import { errorMessage } from '../../../api/errors';
import ConfirmDialog from '../../../components/feedback/ConfirmDialog';
import { useRemovePlayerMutation } from '../api';

interface Props {
  contest: { id: string; name: string } | null;
  userId: string | undefined;
  onClose: () => void;
  onLeft?: () => void;
}

export default function LeaveContestDialog({ contest, userId, onClose, onLeft }: Props) {
  const [removePlayer, { isLoading, error, reset }] = useRemovePlayerMutation();

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    if (!contest || !userId) {
      return;
    }

    try {
      await removePlayer({ contestId: contest.id, userId }).unwrap();
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
      Are you sure you want to leave <strong>{contest?.name}</strong>? Your squares go back on the
      board. You can rejoin later with the invite link, starting with no squares.
    </ConfirmDialog>
  );
}
