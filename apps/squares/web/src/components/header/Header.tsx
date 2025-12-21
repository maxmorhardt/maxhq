import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import GridViewIcon from '@mui/icons-material/GridView';
import InfoIcon from '@mui/icons-material/Info';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useState, type MouseEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import HeaderAuth from './HeaderAuth';
import HeaderMenu from './HeaderMenu';

const pages = [
  { name: 'Contests', icon: <GridViewIcon />, navigate: '/contests' },
  { name: 'Learn More', icon: <InfoIcon />, navigate: '/learn-more' },
  { name: 'Contact', icon: <ContactSupportIcon />, navigate: '/contact' },
];

const settings = [
  { name: 'Account', icon: <SettingsIcon fontSize="small" /> },
  { name: 'Logout', icon: <LogoutIcon fontSize="small" /> },
];

export default function Header() {
  const auth = useAuth();
  const navigate = useNavigate();

  // anchor elements for dropdown menus
  const [anchorElNav, setAnchorElNav] = useState<HTMLElement | null>(null);
  const [anchorElUser, setAnchorElUser] = useState<HTMLElement | null>(null);

  // menu toggle handlers
  const handleOpenNavMenu = (event: MouseEvent<HTMLElement>) => setAnchorElNav(event.currentTarget);
  const handleOpenUserMenu = (event: MouseEvent<HTMLElement>) =>
    setAnchorElUser(event.currentTarget);
  const handleCloseNavMenu = () => setAnchorElNav(null);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  // redirect to keycloak registration page
  const handleRegister = () => {
    const { authority, client_id } = auth.settings;
    const redirectUri = window.location.origin;
    const registrationUrl = `${authority}/protocol/openid-connect/registrations?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    window.location.href = registrationUrl;
  };

  // handle account settings menu clicks
  const handleSettingClick = (setting: string) => {
    if (setting === 'Account') {
      window.open('https://auth.maxstash.io/realms/maxstash/account', '_blank');
    } else if (setting === 'Logout') {
      auth.signoutRedirect({ post_logout_redirect_uri: window.location.href });
    }

    handleCloseUserMenu();
  };

  return (
    <>
      {/* main app bar */}
      <AppBar position="static">
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {/* desktop logo and brand */}
            <Box
              sx={{ display: { xs: 'none', md: 'flex' }, mr: 2, cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              <img src="/squares_logo.png" alt="Logo" style={{ width: 35, height: 'auto' }} />
            </Box>

            <Typography
              variant="h6"
              noWrap
              onClick={() => navigate('/')}
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'flex' },
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.1em',
                color: 'inherit',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              Squares
            </Typography>

            {/* mobile navigation menu */}
            <HeaderMenu
              handleOpenNavMenu={handleOpenNavMenu}
              handleCloseNavMenu={handleCloseNavMenu}
              handleRegister={handleRegister}
              anchorElNav={anchorElNav}
              pages={pages}
            />

            {/* mobile logo and brand */}
            <Box
              sx={{ display: { xs: 'flex', md: 'none' }, mr: 2, cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              <img src="/squares_logo.png" alt="Logo" style={{ width: 35, height: 'auto' }} />
            </Box>

            <Typography
              variant="h5"
              noWrap
              onClick={() => navigate('/')}
              sx={{
                mr: 2,
                display: { xs: 'flex', md: 'none' },
                flexGrow: 1,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.1em',
                color: 'inherit',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              Squares
            </Typography>

            {/* desktop navigation links */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              {pages.map((page) => {
                // hide contests link if not authenticated
                if (page.name === 'Contests' && !auth.isAuthenticated) {
                  return;
                }

                return (
                  <Button
                    key={page.name}
                    onClick={() => {
                      handleCloseNavMenu();
                      navigate(page.navigate);
                    }}
                    sx={{
                      my: 2,
                      mx: 1,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    {page.icon}
                    {page.name}
                  </Button>
                );
              })}
            </Box>

            {/* authentication controls (login/register or user menu) */}
            <HeaderAuth
              handleOpenUserMenu={handleOpenUserMenu}
              handleCloseUserMenu={handleCloseUserMenu}
              handleRegister={handleRegister}
              handleSettingClick={handleSettingClick}
              anchorElUser={anchorElUser}
              settings={settings}
            />
          </Toolbar>
        </Container>
      </AppBar>
    </>
  );
}
