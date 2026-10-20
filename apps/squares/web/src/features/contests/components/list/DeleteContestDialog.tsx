import { Box } from '@mui/material';
import { errorMessage } from '../../../../api/errors';
import ConfirmDialog from '../../../../components/feedback/ConfirmDialog';
import type { ContestSummary } from '../../../../types/contest';
import { useDeleteContestMutation } from '../../api';

interface Props {
  contest: ContestSummary | null;
  onClose: () => void;
}

export default function DeleteContestDialog({ contest, onClose }: Props) {
  const [deleteContest, { isLoading, error, reset }] = useDeleteContestMutation();

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    if (!contest) {
      return;
    }

    try {
      await deleteContest(contest.id).unwrap();
      handleClose();
    } catch {
      // the error renders in the dialog
    }
  };

  return (
    <ConfirmDialog
      open={!!contest}
      title="Delete Confirmation"
      confirmLabel="Yes, Delete"
      onConfirm={handleConfirm}
      onClose={handleClose}
      loading={isLoading}
      error={error ? errorMessage(error, 'Failed to delete the contest. Please try again.') : null}
    >
      Are you sure you want to delete this contest? This action cannot be undone.
      <Box
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 2,
          background: 'rgba(255,68,68,0.1)',
          border: '1px solid rgba(255,68,68,0.3)',
          color: '#ff5d5d',
          fontWeight: 500,
        }}
      >
        Contest to delete: <strong>{contest?.name}</strong>
      </Box>
    </ConfirmDialog>
  );
}
