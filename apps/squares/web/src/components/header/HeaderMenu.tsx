import HowToRegIcon from '@mui/icons-material/HowToReg';
import LoginIcon from '@mui/icons-material/Login';
import MenuIcon from '@mui/icons-material/Menu';
import { Divider } from '@mui/material';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import type { JSX, MouseEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

interface HeaderMenuProps {
  handleOpenNavMenu: (event: MouseEvent<HTMLElement>) => void;
  handleCloseNavMenu: () => void;
  handleRegister: () => void;
  anchorElNav: null | HTMLElement;
  pages: { name: string; icon: JSX.Element; navigate: string }[];
}

export default function HeaderMenu({
  handleOpenNavMenu,
  handleCloseNavMenu,
  handleRegister,
  anchorElNav,
  pages,
}: HeaderMenuProps) {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    // mobile menu button and dropdown
    <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
      <IconButton size="large" aria-label="menu" onClick={handleOpenNavMenu} color="inherit">
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
        {/* navigation menu items */}
        {pages.map((page) => {
          // hide contests link if not authenticated
          if (page.name === 'Contests' && !auth.isAuthenticated) {
            return null;
          }

          return (
            <MenuItem
              key={page.name}
              onClick={() => {
                navigate(page.navigate);
                handleCloseNavMenu();
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {page.icon}
                <Typography>{page.name}</Typography>
              </Box>
            </MenuItem>
          );
        })}

        {/* mobile login and register menu items */}
        {!auth.isAuthenticated && <Divider />}
        {!auth.isAuthenticated && (
          <MenuItem
            onClick={() => {
              auth.signinRedirect({
                redirect_uri: window.location.href,
              });
              handleCloseNavMenu();
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LoginIcon fontSize="small" />
              <Typography>Login</Typography>
            </Box>
          </MenuItem>
        )}
        {!auth.isAuthenticated && (
          <MenuItem
            onClick={() => {
              handleRegister();
              handleCloseNavMenu();
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HowToRegIcon fontSize="small" />
              <Typography>Register</Typography>
            </Box>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
