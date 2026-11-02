import GitHubIcon from '@mui/icons-material/GitHub';
import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import { Box, Button, Divider, Link, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { signInWithProvider, type OIDCProvider } from './oidc';

interface Props {
  redirectPath?: string;
  onSelect?: () => void;
}

const providers: { id: OIDCProvider; label: string; icon: ReactNode }[] = [
  { id: 'google', label: 'Google', icon: <GoogleIcon /> },
  { id: 'microsoft', label: 'Microsoft', icon: <MicrosoftIcon /> },
  { id: 'github', label: 'GitHub', icon: <GitHubIcon /> },
];

export default function SignInOptions({ redirectPath, onSelect }: Props) {
  const auth = useAuth();

  const handleSignIn = (provider: OIDCProvider) => {
    onSelect?.();
    signInWithProvider(auth, provider, redirectPath);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {providers.map((provider) => (
          <Button
            key={provider.id}
            variant="outlined"
            color="inherit"
            startIcon={provider.icon}
            onClick={() => handleSignIn(provider.id)}
            sx={{ justifyContent: 'flex-start', px: 2, py: 1 }}
          >
            Sign in with {provider.label}
          </Button>
        ))}
      </Box>
      <Divider sx={{ my: 1.5 }} />
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'text.secondary', maxWidth: 280 }}
      >
        By signing in, you agree to our{' '}
        <Link
          href="https://maxhq.io/terms-of-service"
          target="_blank"
          rel="noreferrer"
          color="inherit"
          underline="always"
        >
          terms of service
        </Link>{' '}
        and{' '}
        <Link
          href="https://maxhq.io/privacy-policy"
          target="_blank"
          rel="noreferrer"
          color="inherit"
          underline="always"
        >
          privacy policy
        </Link>
        .
      </Typography>
    </Box>
  );
}
