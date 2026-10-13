import DarkModeIcon from '@mui/icons-material/DarkMode';
import EmailIcon from '@mui/icons-material/Email';
import GridViewIcon from '@mui/icons-material/GridView';
import HomeIcon from '@mui/icons-material/Home';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useColorScheme,
} from '@mui/material';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

interface NavItem {
  label: string;
  icon: ReactNode;
  route: string;
}

const items: NavItem[] = [
  { label: 'Home', icon: <HomeIcon fontSize="small" />, route: '/' },
  { label: 'Projects', icon: <WorkIcon fontSize="small" />, route: '/projects' },
  { label: 'Apps', icon: <GridViewIcon fontSize="small" />, route: '/apps' },
  { label: 'About', icon: <PersonIcon fontSize="small" />, route: '/about' },
  { label: 'Contact', icon: <EmailIcon fontSize="small" />, route: '/contact' },
];

export default function AppHeader() {
  const { pathname } = useLocation();
  const { mode, systemMode, setMode } = useColorScheme();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // hold the icon back until mount; the scheme isn't known until storage is read
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const resolvedMode = mode === 'system' ? systemMode : mode;
  const isDark = resolvedMode !== 'light';

  const handleOpenNavMenu = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleCloseNavMenu = () => setAnchorEl(null);

  return (
    <AppBar>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ gap: 1 }}>
          {/* brand / logo */}
          <Typography
            component={Link}
            to="/"
            aria-label="maxstash home"
            variant="h6"
            sx={{
              mr: 2,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              fontSize: '1.05rem',
              color: 'text.primary',
              textDecoration: 'none',
            }}
          >
            <Box component="img" src="/logo.svg" alt="" width={28} height={28} />
            maxstash
          </Typography>

          {/* desktop nav links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
            {items.map((item) => (
              <Button
                key={item.route}
                component={Link}
                to={item.route}
                startIcon={item.icon}
                color={pathname === item.route ? 'primary' : 'inherit'}
                sx={{ color: pathname === item.route ? undefined : 'text.secondary' }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ flex: 1 }} />

          {/* theme toggle */}
          <IconButton
            onClick={() => setMode(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            color="inherit"
          >
            {mounted ? (
              isDark ? (
                <LightModeIcon fontSize="small" />
              ) : (
                <DarkModeIcon fontSize="small" />
              )
            ) : (
              <Box sx={{ width: 20, height: 20 }} />
            )}
          </IconButton>

          {/* mobile nav menu */}
          <IconButton
            onClick={handleOpenNavMenu}
            aria-label="Open navigation"
            color="inherit"
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseNavMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {items.map((item) => (
              <MenuItem
                key={item.route}
                component={Link}
                to={item.route}
                selected={pathname === item.route}
                onClick={handleCloseNavMenu}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
