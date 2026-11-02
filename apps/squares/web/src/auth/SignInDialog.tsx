import CloseIcon from '@mui/icons-material/Close';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import SignInOptions from './SignInOptions';

interface SignInDialogProps {
  open: boolean;
  onClose: () => void;
  redirectPath?: string;
}

export default function SignInDialog({ open, onClose, redirectPath }: SignInDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableScrollLock
      slotProps={{ paper: { sx: { minWidth: 300 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1, pr: 6 }}>
        Sign in
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Close dialog"
          sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 2, pt: '4px !important' }}>
        <SignInOptions redirectPath={redirectPath} onSelect={onClose} />
      </DialogContent>
    </Dialog>
  );
}
