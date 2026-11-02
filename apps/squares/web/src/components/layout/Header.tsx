import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import GridViewIcon from '@mui/icons-material/GridView';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useState, type MouseEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import { Link, useLocation, useNavigate } from 'react-router';
import { easing, fonts, game } from '../../app/theme';
import CreateContestButton from '../../features/contests/components/CreateContestButton';
import HeaderAuth from './HeaderAuth';
import HeaderMenu from './HeaderMenu';
import { HEADER_HEIGHT } from '../../types/layout';
import { notifySession } from '../../auth/session';

const pages = [
  { name: 'Home', icon: <HomeIcon />, navigate: '/' },
  { name: 'Contests', icon: <GridViewIcon />, navigate: '/contests' },
  { name: 'Games', icon: <SportsFootballIcon />, navigate: '/games' },
  { name: 'Leaderboard', icon: <LeaderboardIcon />, navigate: '/leaderboard' },
  { name: 'How to Play', icon: <InfoIcon />, navigate: '/learn-more' },
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

  const [anchorElNav, setAnchorElNav] = useState<HTMLElement | null>(null);
  const [anchorElUser, setAnchorElUser] = useState<HTMLElement | null>(null);

  const handleOpenNavMenu = (event: MouseEvent<HTMLElement>) => setAnchorElNav(event.currentTarget);
  const handleOpenUserMenu = (event: MouseEvent<HTMLElement>) =>
    setAnchorElUser(event.currentTarget);
  const handleCloseNavMenu = () => setAnchorElNav(null);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  const handleSettingClick = (setting: string) => {
    if (setting === 'Profile') {
      navigate('/profile');
    } else if (setting === 'Logout') {
      // revoke the token on the server first, so a copy of it stops working too
      const token = auth.user?.id_token;
      void notifySession('sign-out', token).then(() => auth.removeUser());

      // only leave pages that require auth
      const path = location.pathname;
      if (path === '/profile' || path.startsWith('/contests')) {
        navigate('/');
      }
    }

    handleCloseUserMenu();
  };

  const wordmarkSx = {
    fontFamily: fonts.display,
    fontWeight: 800,
    fontSize: '1.45rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    lineHeight: 1,
    color: 'text.primary',
  } as const;

  return (
    <>
      {/* main app bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: alpha(game.night, 0.78),
          backgroundImage: 'none',
          backdropFilter: 'blur(14px) saturate(150%)',
          borderBottom: `1px solid ${game.line}`,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: HEADER_HEIGHT, height: HEADER_HEIGHT, gap: 1 }}>
            {/* logo and brand */}
            <Box
              component={Link}
              to="/"
              prefetch="intent"
              aria-label="Squares home"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                mr: { lg: 3 },
                textDecoration: 'none',
              }}
            >
              <Box component="img" src="/logo.svg" alt="" sx={{ width: 32, height: 32 }} />
              <Typography component="span" noWrap sx={wordmarkSx}>
                Squares
              </Typography>
            </Box>

            {/* spacer pushes the mobile menu and auth to the right */}
            <Box sx={{ flexGrow: 1, display: { xs: 'block', lg: 'none' } }} />

            {/* desktop navigation links */}
            <Box
              component="nav"
              sx={{ flexGrow: 1, display: { xs: 'none', lg: 'flex' }, gap: 0.5 }}
            >
              {pages.map((page) => {
                const active =
                  location.pathname === page.navigate ||
                  location.pathname.startsWith(`${page.navigate}/`);

                return (
                  <Button
                    key={page.name}
                    component={Link}
                    to={page.navigate}
                    prefetch="intent"
                    aria-current={active ? 'page' : undefined}
                    onClick={handleCloseNavMenu}
                    sx={{
                      position: 'relative',
                      px: 1.5,
                      color: active ? 'text.primary' : 'text.secondary',
                      fontWeight: active ? 700 : 600,
                      '&:hover': {
                        color: 'text.primary',
                        backgroundColor: alpha(game.chalk, 0.05),
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        left: 12,
                        right: 12,
                        bottom: { xs: -10, sm: -14 },
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: 'primary.main',
                        transform: active ? 'scaleX(1)' : 'scaleX(0)',
                        transition: `transform 300ms ${easing.out}`,
                      },
                    }}
                  >
                    {page.name}
                  </Button>
                );
              })}
            </Box>

            {/* the one action a new visitor came for, on every page */}
            <Box sx={{ display: { xs: 'none', sm: 'block' }, mr: 0.5 }}>
              <CreateContestButton size="small" />
            </Box>

            {/* mobile navigation menu (hamburger, grouped with auth on the right) */}
            <HeaderMenu
              handleOpenNavMenu={handleOpenNavMenu}
              handleCloseNavMenu={handleCloseNavMenu}
              anchorElNav={anchorElNav}
              pages={pages}
            />

            {/* sign-in button or user menu */}
            <HeaderAuth
              handleOpenUserMenu={handleOpenUserMenu}
              handleCloseUserMenu={handleCloseUserMenu}
              handleSettingClick={handleSettingClick}
              isAuthButtonDisabled={auth.isLoading}
              anchorElUser={anchorElUser}
              settings={settings}
            />
          </Toolbar>
        </Container>
      </AppBar>
    </>
  );
}
