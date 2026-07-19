import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import GridViewIcon from '@mui/icons-material/GridView';
import InfoIcon from '@mui/icons-material/Info';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useState, type MouseEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import { useLocation, useNavigate } from 'react-router-dom';
import HeaderAuth from './HeaderAuth';
import HeaderMenu from './HeaderMenu';

const pages = [
  { name: 'Contests', icon: <GridViewIcon />, navigate: '/contests' },
  { name: 'Learn More', icon: <InfoIcon />, navigate: '/learn-more' },
  { name: 'Contact', icon: <ContactSupportIcon />, navigate: '/contact' },
];

const settings = [
  { name: 'Profile', icon: <PersonIcon fontSize="small" /> },
  { name: 'Logout', icon: <LogoutIcon fontSize="small" /> },
];

export default function Header() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // anchor elements for dropdown menus
  const [anchorElNav, setAnchorElNav] = useState<HTMLElement | null>(null);
  const [anchorElUser, setAnchorElUser] = useState<HTMLElement | null>(null);

  // menu toggle handlers
  const handleOpenNavMenu = (event: MouseEvent<HTMLElement>) => setAnchorElNav(event.currentTarget);
  const handleOpenUserMenu = (event: MouseEvent<HTMLElement>) =>
    setAnchorElUser(event.currentTarget);
  const handleCloseNavMenu = () => setAnchorElNav(null);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  const isAuthButtonDisabled = auth.isLoading;

  // handle account settings menu clicks
  const handleSettingClick = (setting: string) => {
    if (setting === 'Profile') {
      navigate('/profile');
    } else if (setting === 'Logout') {
      void auth.removeUser();

      // only leave pages that require auth
      const path = location.pathname;
      if (path === '/profile' || path.startsWith('/contests')) {
        navigate('/');
      }
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

            {/* mobile logo and brand (left) */}
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
              }}
              onClick={() => navigate('/')}
            >
              <img src="/squares_logo.png" alt="Logo" style={{ width: 35, height: 'auto' }} />
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '.1em',
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                Squares
              </Typography>
            </Box>

            {/* spacer pushes the mobile menu and auth to the right */}
            <Box sx={{ flexGrow: 1, display: { xs: 'block', md: 'none' } }} />

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

            {/* mobile navigation menu (hamburger, grouped with auth on the right) */}
            <HeaderMenu
              handleOpenNavMenu={handleOpenNavMenu}
              handleCloseNavMenu={handleCloseNavMenu}
              anchorElNav={anchorElNav}
              pages={pages}
            />

            {/* authentication controls (login/register or user menu) */}
            <HeaderAuth
              handleOpenUserMenu={handleOpenUserMenu}
              handleCloseUserMenu={handleCloseUserMenu}
              handleSettingClick={handleSettingClick}
              isAuthButtonDisabled={isAuthButtonDisabled}
              anchorElUser={anchorElUser}
              settings={settings}
            />
          </Toolbar>
        </Container>
      </AppBar>
    </>
  );
}
