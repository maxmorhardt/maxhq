import {
  GridOn as GridIcon,
  Groups as GroupsIcon,
  Shuffle as ShuffleIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  const handleGetStarted = () => {
    if (auth.isAuthenticated) {
      navigate('/contests/create');
    } else {
      auth.signinRedirect();
    }
  };

  return (
    <>
      {/* Hero Section with Gradient Background */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                mb: 3,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              Squares
            </Typography>
            <Typography
              variant="h4"
              sx={{
                mb: 4,
                fontWeight: 300,
                maxWidth: 700,
                mx: 'auto',
                opacity: 0.95,
                fontSize: { xs: '1.2rem', md: '1.5rem' },
                lineHeight: 1.4,
              }}
            >
              The ultimate football squares game for any gathering. Create contests, fill squares,
              and win big during the big game!
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleGetStarted}
                sx={{
                  px: 6,
                  py: 2,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Create Your First Contest
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                Learn More
              </Button>
            </Box>
          </Box>
        </Container>

        {/* Decorative Background Elements */}
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* How It Works Section */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            sx={{
              fontWeight: 700,
              mb: 2,
              color: 'text.primary',
            }}
          >
            How It Works
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              mb: 6,
              maxWidth: 600,
              mx: 'auto',
              fontWeight: 400,
            }}
          >
            Get your football squares game running in 4 simple steps
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                position: 'relative',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
                  borderColor: 'primary.main',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: 'primary.main',
                    color: 'white',
                    mr: 3,
                  }}
                >
                  <GridIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    Fill Out the Squares
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    Participants choose and fill out squares on a 10x10 contest grid. Each square
                    represents a potential score combination.
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
                  borderColor: 'primary.main',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: 'secondary.main',
                    color: 'white',
                    mr: 3,
                  }}
                >
                  <ShuffleIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    Randomize Numbers
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    Once all squares are filled, randomly assign numbers 0-9 to both the X and Y
                    axis representing each team.
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
                  borderColor: 'primary.main',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: 'success.main',
                    color: 'white',
                    mr: 3,
                  }}
                >
                  <TrophyIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    Determine Winners
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    At the end of each quarter, take the last digit of both teams' scores to find
                    the winning square.
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
                  borderColor: 'primary.main',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: 'info.main',
                    color: 'white',
                    mr: 3,
                  }}
                >
                  <GroupsIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    Share & Collaborate
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    Share your contest with friends and family. Everyone can see real-time updates
                    as squares are filled.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* Example Section */}
        <Box
          sx={{
            mb: 8,
            p: 6,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Typography
            variant="h3"
            component="h3"
            gutterBottom
            sx={{
              textAlign: 'center',
              mb: 2,
              fontWeight: 700,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            See It In Action
          </Typography>
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              mb: 6,
              maxWidth: 600,
              mx: 'auto',
              fontWeight: 400,
              opacity: 0.9,
            }}
          >
            Here's how winners are determined each quarter
          </Typography>

          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 4,
                mb: 4,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'white' }}>
                  🏈 Game Situation
                </Typography>
                <Typography variant="body1" sx={{ mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                  End of 1st Quarter
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'white' }}>
                  📊 Current Score
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Home Team <strong>14</strong> - Away Team <strong>7</strong>
                </Typography>
              </Paper>
            </Box>

            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.3)',
                textAlign: 'center',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'white' }}>
                🎯 Winning Square
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, color: 'rgba(255,255,255,0.9)' }}>
                Last digits: <strong>4</strong> (Home) × <strong>7</strong> (Away)
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 'bold',
                  color: '#FFD700',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                Square (4,7) Wins! 🏆
              </Typography>
            </Paper>
          </Box>
        </Box>

        {/* Features Section */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
            borderRadius: 4,
            p: 6,
            mb: 8,
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          }}
        >
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            sx={{
              textAlign: 'center',
              mb: 2,
              fontWeight: 700,
              color: 'white',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Why Choose Our Platform?
          </Typography>
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.7)',
              mb: 6,
              maxWidth: 600,
              mx: 'auto',
              fontWeight: 400,
            }}
          >
            Built for simplicity, designed for everyone
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' },
              gap: 4,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                  ⚡
                </Typography>
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
                Real-time Updates
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
                See changes instantly as players fill out squares with live synchronization
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  boxShadow: '0 4px 12px rgba(245, 87, 108, 0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                  🔗
                </Typography>
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
                Easy Sharing
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
                Share contests with a simple link - no accounts required for participants
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  boxShadow: '0 4px 12px rgba(79, 172, 254, 0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                  📱
                </Typography>
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
                Mobile Friendly
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
                Works perfectly on phones, tablets, and computers with responsive design
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  boxShadow: '0 4px 12px rgba(168, 237, 234, 0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                  🆓
                </Typography>
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
                Free to Use
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>
                Create unlimited contests for all your gatherings at no cost
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Call to Action */}
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 4,
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 48px rgba(102, 126, 234, 0.3)',
          }}
        >
          <Typography
            variant="h3"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: 'white',
              mb: 2,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            Ready to Get Started?
          </Typography>
          <Typography
            variant="h6"
            sx={{
              mb: 4,
              color: 'rgba(255,255,255,0.9)',
              maxWidth: 500,
              mx: 'auto',
              fontWeight: 400,
              lineHeight: 1.5,
            }}
          >
            Create your first contest in seconds and share it with your friends and family for an
            unforgettable game experience.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{
                px: 6,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 3,
                textTransform: 'none',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(255,255,255,0.1)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.25)',
                },
              }}
            >
              Create Contest Now
            </Button>
          </Box>

          {/* Trust indicators */}
          <Box
            sx={{
              mt: 4,
              display: 'flex',
              justifyContent: 'center',
              gap: 4,
              flexWrap: 'wrap',
              opacity: 0.9,
            }}
          >
            <Typography
              variant="body2"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.8)' }}
            >
              ✅ No credit card required
            </Typography>
            <Typography
              variant="body2"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.8)' }}
            >
              ✅ Setup in under 2 minutes
            </Typography>
            <Typography
              variant="body2"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.8)' }}
            >
              ✅ Works on all devices
            </Typography>
          </Box>
        </Box>
      </Container>
    </>
  );
}
