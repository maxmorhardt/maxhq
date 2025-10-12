import AddIcon from '@mui/icons-material/Add';
import GridViewIcon from '@mui/icons-material/GridView';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import CreateContest from '../contest/CreateContest';
import HeaderAuth from './HeaderAuth';
import HeaderMenu from './HeaderMenu';

const pages = [{ name: 'Contests', icon: <GridViewIcon />, navigate: '/contests' }];

const settings = [
  { name: 'Account', icon: <SettingsIcon fontSize="small" /> },
  { name: 'Logout', icon: <LogoutIcon fontSize="small" /> },
];

export default function Header() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [anchorElNav, setAnchorElNav] = useState<HTMLElement | null>(null);
  const [anchorElUser, setAnchorElUser] = useState<HTMLElement | null>(null);
  const [createContestOpen, setCreateContestOpen] = useState(false);

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
      auth.signoutRedirect({ post_logout_redirect_uri: window.location.origin });
    }

    handleCloseUserMenu();
  };

  const handleCreateContest = () => {
    if (auth.isAuthenticated) {
      setCreateContestOpen(true);
    } else {
      auth.signinRedirect();
    }
  };

  const handleCreateContestClose = (id: string) => {
    setCreateContestOpen(false);

    if (id) {
      navigate(`/contests/${id}`);
    }
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
              handleCreateContest={handleCreateContest}
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
              {auth.isAuthenticated &&
                pages.map((page) => (
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
                ))}
            </Box>

            {/* Create Contest Button (desktop) */}
            {auth.isAuthenticated && (
              <Button
                variant="contained"
                size="small"
                onClick={handleCreateContest}
                sx={{
                  mr: 2,
                  display: { xs: 'none', md: 'flex' },
                  fontSize: '0.6rem',
                  padding: '4px 8px',
                }}
              >
                <AddIcon sx={{ mr: 0.5 }} fontSize="small" />
                Create Contest
              </Button>
            )}

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

      <CreateContest open={createContestOpen} onClose={handleCreateContestClose} />
    </>
  );
}
