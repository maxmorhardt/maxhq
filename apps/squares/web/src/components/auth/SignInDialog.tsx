import CloseIcon from '@mui/icons-material/Close';
import GitHubIcon from '@mui/icons-material/GitHub';
import GoogleIcon from '@mui/icons-material/Google';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Typography,
} from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { signInWithProvider, type OidcProvider } from '../../utils/oidcHelpers';

interface SignInDialogProps {
  open: boolean;
  onClose: () => void;
  redirectPath?: string;
}

export default function SignInDialog({ open, onClose, redirectPath }: SignInDialogProps) {
  const auth = useAuth();

  const handleSignIn = (provider: OidcProvider) => {
    onClose();
    signInWithProvider(auth, provider, redirectPath);
  };

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
      <DialogContent sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 0.5 }}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<GoogleIcon />}
            onClick={() => handleSignIn('google')}
            sx={{ justifyContent: 'flex-start', px: 2, py: 1 }}
          >
            Sign in with Google
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<GitHubIcon />}
            onClick={() => handleSignIn('github')}
            sx={{ justifyContent: 'flex-start', px: 2, py: 1 }}
          >
            Sign in with GitHub
          </Button>
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Typography
          variant="caption"
          sx={{ display: 'block', color: 'text.secondary', maxWidth: 280 }}
        >
          By signing in, you agree to our{' '}
          <Link
            href="https://maxstash.io/terms-of-service"
            target="_blank"
            rel="noreferrer"
            color="inherit"
            underline="always"
          >
            terms of service
          </Link>{' '}
          and{' '}
          <Link
            href="https://maxstash.io/privacy-policy"
            target="_blank"
            rel="noreferrer"
            color="inherit"
            underline="always"
          >
            privacy policy
          </Link>
          .
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
