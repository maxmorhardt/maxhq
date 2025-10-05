import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HomeIcon from '@mui/icons-material/Home';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import { Divider } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';

const pages = [
  { name: 'Home', icon: <HomeIcon fontSize="small" /> },
  { name: 'Grids', icon: <AttachMoneyIcon fontSize="small" /> },
];

const settings = [
  { name: 'Account', icon: <SettingsIcon fontSize="small" /> },
  { name: 'Logout', icon: <LogoutIcon fontSize="small" /> },
];

export default function Header() {
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

  const auth = useAuth();

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorElNav(event.currentTarget);
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorElUser(event.currentTarget);
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
      window.location.href = "https://auth.maxstash.io/realms/maxstash/account";
    } else if (setting === 'Logout') {
      auth.signoutRedirect({ post_logout_redirect_uri: window.location.origin });
    }

    handleCloseUserMenu();
  };

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Desktop logo */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 2 }}>
            <img src="/squares_logo.png" alt="Logo" style={{ width: 35, height: 'auto' }} />
          </Box>

          <Typography
            variant="h6"
            noWrap
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.1em',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            Squares
          </Typography>

          {/* Mobile menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="menu"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: 'block', md: 'none' } }}
            >
              {pages.map((page) => (
                <MenuItem key={page.name} onClick={handleCloseNavMenu}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {page.icon}
                    <Typography>{page.name}</Typography>
                  </Box>
                </MenuItem>
              ))}

              {/* Mobile Login/Register */}
							{!auth.isAuthenticated && <Divider />}
							{!auth.isAuthenticated && (
								<MenuItem onClick={() => { auth.signinRedirect(); handleCloseNavMenu(); }}>
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<LoginIcon fontSize="small" />
										<Typography>Login</Typography>
									</Box>
								</MenuItem>
							)}
							{!auth.isAuthenticated && (
								<MenuItem onClick={() => { handleRegister(); handleCloseNavMenu(); }}>
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<HowToRegIcon fontSize="small" />
										<Typography>Register</Typography>
									</Box>
								</MenuItem>
							)}
            </Menu>
          </Box>

          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, mr: 2 }}>
            <img src="/squares_logo.png" alt="Logo" style={{ width: 35, height: 'auto' }} />
          </Box>

          <Typography
            variant="h5"
            noWrap
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.1em',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            Squares
          </Typography>

          {/* Page links (desktop) */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {pages.map((page) => (
              <Button
                key={page.name}
                onClick={handleCloseNavMenu}
                sx={{ my: 2, mx: 1, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}
              >
                {page.icon}
                {page.name}
              </Button>
            ))}
          </Box>

          {/* Auth section (desktop) */}
          <Box sx={{ flexGrow: 0 }}>
            {!auth.isAuthenticated ? (
              <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                <Button color="inherit" sx={{ mr: 2 }} onClick={() => auth.signinRedirect()} variant="outlined">
                  Login
                </Button>
                <Button color="primary" onClick={handleRegister} variant="contained">
                  Register
                </Button>
              </Box>
            ) : (
              <>
                <Tooltip title="Open settings">
                  <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                    <Avatar alt={auth.user?.profile?.name} />
                  </IconButton>
                </Tooltip>
                <Menu
                  sx={{ mt: '45px' }}
                  id="menu-appbar"
                  anchorEl={anchorElUser}
                  anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  open={Boolean(anchorElUser)}
                  onClose={handleCloseUserMenu}
                >
                  {settings.map((setting) => (
                    <MenuItem key={setting.name} onClick={() => handleSettingClick(setting.name)}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {setting.icon}
                        <Typography>{setting.name}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}