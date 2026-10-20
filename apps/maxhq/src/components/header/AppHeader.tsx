import DarkModeIcon from '@mui/icons-material/DarkMode';
import EmailIcon from '@mui/icons-material/Email';
import GitHubIcon from '@mui/icons-material/GitHub';
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
import { easing } from '../../theme';

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
  // a prerendered route can be requested with a trailing slash
  const pathname = useLocation().pathname.replace(/(.)\/+$/, '$1');
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
        <Toolbar disableGutters sx={{ gap: { xs: 0.5, md: 1 } }}>
          {/* brand / logo */}
          <Typography
            component={Link}
            to="/"
            aria-label="maxhq home"
            sx={{
              mr: { md: 3 },
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.25,
              fontSize: '1.08rem',
              fontWeight: 680,
              letterSpacing: '-0.02em',
              color: 'text.primary',
              textDecoration: 'none',
            }}
          >
            <Box component="img" src="/logo.svg" alt="" width={30} height={30} />
            maxhq
          </Typography>

          {/* desktop nav links */}
          <Box component="nav" sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.25 }}>
            {items.map((item) => {
              const active = pathname === item.route;

              return (
                <Button
                  key={item.route}
                  component={Link}
                  to={item.route}
                  aria-current={active ? 'page' : undefined}
                  color="inherit"
                  sx={{
                    position: 'relative',
                    px: 1.5,
                    fontWeight: active ? 620 : 520,
                    color: active ? 'text.primary' : 'text.secondary',
                    '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      left: 12,
                      right: 12,
                      bottom: -13,
                      height: 2,
                      borderRadius: 1,
                      bgcolor: 'primary.main',
                      transform: active ? 'scaleX(1)' : 'scaleX(0)',
                      transition: `transform 0.3s ${easing.reveal}`,
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ flex: 1 }} />

          <IconButton
            component="a"
            href="https://github.com/maxmorhardt"
            target="_blank"
            rel="noreferrer"
            aria-label="maxmorhardt on GitHub"
            color="inherit"
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            <GitHubIcon fontSize="small" />
          </IconButton>

          {/* theme toggle */}
          <IconButton
            onClick={() => setMode(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            color="inherit"
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
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

          <Button
            component={Link}
            to="/contact"
            variant="contained"
            size="small"
            sx={{ display: { xs: 'none', md: 'inline-flex' }, ml: 1, py: 0.75 }}
          >
            Get in touch
          </Button>

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
