import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Box,
} from '@mui/material';
import type { UserActiveContest } from '../../types/user';

export interface DeleteAccountDialogProps {
  open: boolean;
  deleting: boolean;
  busyId: string | null;
  activeContests: UserActiveContest[] | null;
  activeContestsError: boolean;
  actionError: string | null;
  onClose: () => void;
  onRetry: () => void;
  onDeleteContest: (id: string) => void;
  onLeaveContest: (id: string) => void;
  onConfirmDelete: () => void;
}

export default function DeleteAccountDialog({
  open,
  deleting,
  busyId,
  activeContests,
  activeContestsError,
  actionError,
  onClose,
  onRetry,
  onDeleteContest,
  onLeaveContest,
  onConfirmDelete,
}: DeleteAccountDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => !deleting && busyId === null && onClose()}
      maxWidth="sm"
      fullWidth
    >
      {activeContestsError ? (
        <>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              We couldn't verify whether you have active contests, so account deletion is blocked
              for safety. Please try again.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => !deleting && busyId === null && onClose()}
              disabled={deleting || busyId !== null}
            >
              Close
            </Button>
            <Button onClick={onRetry} variant="contained" disabled={deleting || busyId !== null}>
              Retry
            </Button>
          </DialogActions>
        </>
      ) : activeContests === null ? (
        <>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
          </DialogActions>
        </>
      ) : activeContests.length > 0 ? (
        <>
          <DialogTitle>Finish your contests first</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 1.5 }}>
              You're still active in these contests. Delete the ones you own and leave the ones
              you've joined, then you can delete your account.
            </DialogContentText>
            {actionError && (
              <Alert severity="error" sx={{ mb: 1.5 }}>
                {actionError}
              </Alert>
            )}
            <List dense disablePadding>
              {activeContests.map((contest) => (
                <ListItem
                  key={contest.id}
                  disableGutters
                  secondaryAction={
                    <Button
                      size="small"
                      color="error"
                      disabled={busyId !== null}
                      startIcon={
                        busyId === contest.id ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : contest.role === 'owner' ? (
                          <DeleteForeverIcon />
                        ) : (
                          <LogoutIcon />
                        )
                      }
                      onClick={() =>
                        contest.role === 'owner'
                          ? onDeleteContest(contest.id)
                          : onLeaveContest(contest.id)
                      }
                    >
                      {contest.role === 'owner' ? 'Delete' : 'Leave'}
                    </Button>
                  }
                >
                  <ListItemText
                    primary={contest.name}
                    secondary={
                      contest.role === 'owner' ? 'You own this contest' : 'You joined this contest'
                    }
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={busyId !== null}>
              Close
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: actionError ? 1.5 : 0 }}>
              Your squares history will be anonymized and your personal data removed. This action
              cannot be undone.
            </DialogContentText>
            {actionError && <Alert severity="error">{actionError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={onConfirmDelete}
              color="error"
              variant="contained"
              disabled={deleting}
              startIcon={
                deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteForeverIcon />
              }
            >
              Delete Forever
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
