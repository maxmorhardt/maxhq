import GridViewIcon from '@mui/icons-material/GridView';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import InfoIcon from '@mui/icons-material/Info';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
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

  const [anchorElNav, setAnchorElNav] = useState<HTMLElement | null>(null);
  const [anchorElUser, setAnchorElUser] = useState<HTMLElement | null>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorElNav(event.currentTarget);
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorElUser(event.currentTarget);
  const handleCloseNavMenu = () => setAnchorElNav(null);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  const handleRegister = () => {
    const { authority, client_id } = auth.settings;
    const redirectUri = window.location.origin;
    const registrationUrl = `${authority}/protocol/openid-connect/registrations?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    window.location.href = registrationUrl;
  };

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
      <AppBar position="static">
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {/* Desktop logo */}
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

            {/* Mobile menu */}
            <HeaderMenu
              handleOpenNavMenu={handleOpenNavMenu}
              handleCloseNavMenu={handleCloseNavMenu}
              handleRegister={handleRegister}
              anchorElNav={anchorElNav}
              pages={pages}
            />

            {/* Mobile logo */}
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

            {/* Page links (desktop) */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              {pages.map((page) => {
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

            {/* Auth section */}
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
