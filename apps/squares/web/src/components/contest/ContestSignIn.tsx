import {
  EmojiEvents,
  GridView,
  Groups,
  Help,
  Home,
  Login,
  Mail,
  PersonAdd,
} from '@mui/icons-material';
import { Box, Button, Container, keyframes, Paper, Typography, useTheme } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { Link as RouterLink } from 'react-router-dom';
import { createOidcStateForRegistration } from '../../utils/oidcHelpers';

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

export default function ContestSignIn() {
  const theme = useTheme();
  const auth = useAuth();

  const handleLogin = () => {
    sessionStorage.setItem('auth_redirect_path', window.location.pathname);
    auth.signinRedirect();
  };

  const handleRegister = async () => {
    sessionStorage.setItem('auth_redirect_path', window.location.pathname);
    const { state, codeChallenge } = await createOidcStateForRegistration(auth.settings);
    const authParams = new URLSearchParams({
      client_id: auth.settings.client_id,
      redirect_uri: auth.settings.redirect_uri,
      response_type: 'code',
      scope: auth.settings.scope || 'openid profile email offline_access',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    const nextUrl = `/application/o/authorize/?${authParams.toString()}`;
    const enrollmentUrl = `https://login.maxstash.io/if/flow/enrollment/?next=${encodeURIComponent(nextUrl)}`;
    window.location.href = enrollmentUrl;
  };

  const features = [
    { icon: <GridView />, text: 'Claim your squares' },
    { icon: <EmojiEvents />, text: 'Win each quarter' },
    { icon: <Groups />, text: 'Compete with friends' },
  ];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
      <Box sx={{ textAlign: 'center' }}>
        {/* animated grid icon */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 3,
            animation: `${float} 3s ease-in-out infinite`,
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 32px ${theme.palette.primary.main}40`,
            }}
          >
            <GridView sx={{ fontSize: 40, color: 'white' }} />
          </Box>
        </Box>

        {/* heading */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            mb: 2,
            fontSize: { xs: '1.75rem', md: '2.75rem' },
            color: 'white',
          }}
        >
          You're Invited!
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 300,
            maxWidth: 500,
            mx: 'auto',
            mb: 5,
            lineHeight: 1.6,
          }}
        >
          Someone shared a squares contest with you. Sign in or create an account to join the
          action.
        </Typography>

        {/* feature highlights */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: { xs: 2, sm: 4 },
            mb: 5,
            flexWrap: 'wrap',
          }}
        >
          {features.map((feature, i) => (
            <Paper
              key={i}
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2.5,
                py: 1.5,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                animation: `${pulse} 3s ease-in-out ${i * 0.5}s infinite`,
              }}
            >
              <Box sx={{ color: theme.palette.primary.main, display: 'flex' }}>{feature.icon}</Box>
              <Typography sx={{ color: 'white', fontWeight: 500, fontSize: '0.9rem' }}>
                {feature.text}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* action buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Login />}
            onClick={handleLogin}
            sx={{ px: 4, py: 1.5, fontWeight: 600 }}
          >
            Sign In
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<PersonAdd />}
            onClick={handleRegister}
            sx={{ px: 4, py: 1.5, fontWeight: 600 }}
          >
            Register
          </Button>
        </Box>

        {/* links */}
        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Typography
            component={RouterLink}
            to="/"
            sx={{
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              '&:hover': { color: 'white' },
            }}
          >
            <Home sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
            Home
          </Typography>
          <Typography
            component={RouterLink}
            to="/learn-more"
            sx={{
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              '&:hover': { color: 'white' },
            }}
          >
            <Help sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
            How It Works
          </Typography>
          <Typography
            component={RouterLink}
            to="/contact"
            sx={{
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              '&:hover': { color: 'white' },
            }}
          >
            <Mail sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
            Contact
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
