import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import {
  useDeleteContestMutation,
  useGetActiveContestsQuery,
  useRemoveParticipantMutation,
} from '../contests/api';
import { useToast } from '../toast/useToast';
import { useDeleteMyAccountMutation } from './api';
import type { DeleteAccountDialogProps } from './components/DeleteAccountDialog';

// account deletion is blocked until every active contest is deleted or left, so the dialog walks through them
export function useAccountDeletion() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const email = auth.user?.profile?.email;

  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const active = useGetActiveContestsQuery(undefined, {
    skip: !open,
    refetchOnMountOrArgChange: true,
  });
  const [deleteContest] = useDeleteContestMutation();
  const [removeParticipant] = useRemoveParticipantMutation();
  const [deleteAccount, { isLoading: deleting }] = useDeleteMyAccountMutation();

  const runContestAction = async (id: string, action: () => Promise<unknown>, failure: string) => {
    setActionError(null);
    setBusyId(id);
    try {
      await action();
    } catch {
      setActionError(failure);
    } finally {
      setBusyId(null);
    }
  };

  const dialogProps: DeleteAccountDialogProps = {
    open,
    deleting,
    busyId,
    activeContests: active.data ?? null,
    activeContestsError: active.isError,
    actionError,
    onClose: () => setOpen(false),
    onRetry: () => void active.refetch(),
    onDeleteContest: (id) =>
      runContestAction(
        id,
        () => deleteContest(id).unwrap(),
        'Failed to delete the contest. Please try again.'
      ),
    onLeaveContest: (id) =>
      runContestAction(
        id,
        () => removeParticipant({ contestId: id, userId: email ?? '' }).unwrap(),
        'Failed to leave the contest. Please try again.'
      ),
    onConfirmDelete: async () => {
      setActionError(null);
      try {
        await deleteAccount().unwrap();
        showToast('Your account has been deleted', 'info');
        await auth.removeUser();
        navigate('/');
      } catch {
        setActionError('Failed to delete your account. Please try again.');
        void active.refetch();
      }
    },
  };

  const openDialog = () => {
    setActionError(null);
    setOpen(true);
  };

  return { openDialog, dialogProps };
}
