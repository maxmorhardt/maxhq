import GitHubIcon from '@mui/icons-material/GitHub';
import GoogleIcon from '@mui/icons-material/Google';
import LoginIcon from '@mui/icons-material/Login';
import PersonIcon from '@mui/icons-material/Person';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState, type JSX, type MouseEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import { signInWithProvider, type OidcProvider } from '../../utils/oidcHelpers';

interface HeaderAuthProps {
  handleOpenUserMenu: (event: MouseEvent<HTMLElement>) => void;
  handleCloseUserMenu: () => void;
  handleSettingClick: (setting: string) => void;
  isAuthButtonDisabled: boolean;
  anchorElUser: null | HTMLElement;
  settings: { name: string; icon: JSX.Element }[];
}

export default function HeaderAuth({
  handleOpenUserMenu,
  handleCloseUserMenu,
  handleSettingClick,
  isAuthButtonDisabled,
  anchorElUser,
  settings,
}: HeaderAuthProps) {
  const auth = useAuth();

  const [anchorElSignIn, setAnchorElSignIn] = useState<HTMLElement | null>(null);

  const handleSignIn = (provider: OidcProvider) => {
    setAnchorElSignIn(null);
    signInWithProvider(auth, provider);
  };

  return (
    <Box sx={{ flexGrow: 0 }}>
      {!auth.isAuthenticated ? (
        <Box sx={{ display: 'flex' }}>
          <Button
            color="inherit"
            onClick={(e) => setAnchorElSignIn(e.currentTarget)}
            startIcon={<LoginIcon />}
            disabled={isAuthButtonDisabled}
          >
            Sign In
          </Button>
          <Menu
            id="menu-signin"
            anchorEl={anchorElSignIn}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={Boolean(anchorElSignIn)}
            onClose={() => setAnchorElSignIn(null)}
            disableScrollLock
            slotProps={{ paper: { sx: { mt: 1, minWidth: 250, borderRadius: 2 } } }}
          >
            <Typography variant="subtitle2" sx={{ px: 2, pt: 1, pb: 0.5, fontWeight: 700 }}>
              Sign in
            </Typography>
            <MenuItem onClick={() => handleSignIn('google')} sx={{ py: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <GoogleIcon fontSize="small" />
                <Typography>Google</Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={() => handleSignIn('github')} sx={{ py: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <GitHubIcon fontSize="small" />
                <Typography>GitHub</Typography>
              </Box>
            </MenuItem>
            <Divider />
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                px: 2,
                pt: 0.5,
                pb: 1,
                color: 'text.secondary',
                maxWidth: 250,
              }}
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
          </Menu>
        </Box>
      ) : (
        <>
          <Tooltip title="Account">
            <IconButton color="inherit" onClick={handleOpenUserMenu} aria-label="account">
              <PersonIcon />
            </IconButton>
          </Tooltip>
          <Menu
            id="menu-appbar"
            anchorEl={anchorElUser}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
            disableScrollLock
            slotProps={{ paper: { sx: { mt: 1, minWidth: 250, borderRadius: 2 } } }}
          >
            <Typography
              variant="subtitle2"
              noWrap
              sx={{ px: 2, pt: 1, pb: 0.5, fontWeight: 700, maxWidth: 280 }}
            >
              {auth.user?.profile?.email}
            </Typography>
            {settings.map((setting) => (
              <MenuItem
                key={setting.name}
                onClick={() => handleSettingClick(setting.name)}
                sx={{ py: 1.25 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {setting.icon}
                  <Typography>{setting.name}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Box>
  );
}
