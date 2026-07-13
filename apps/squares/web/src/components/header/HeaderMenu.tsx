import MenuIcon from '@mui/icons-material/Menu';
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
  anchorElNav: null | HTMLElement;
  pages: { name: string; icon: JSX.Element; navigate: string }[];
}

export default function HeaderMenu({
  handleOpenNavMenu,
  handleCloseNavMenu,
  anchorElNav,
  pages,
}: HeaderMenuProps) {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    // mobile menu button and dropdown
    <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
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
        disableScrollLock
        sx={{ display: { xs: 'block', md: 'none' } }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: 2 } } }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, pt: 1, pb: 0.5, fontWeight: 700 }}>
          Menu
        </Typography>

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
              sx={{ py: 1.25 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {page.icon}
                <Typography>{page.name}</Typography>
              </Box>
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}
