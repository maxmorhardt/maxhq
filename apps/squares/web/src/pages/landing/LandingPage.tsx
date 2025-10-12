import {
  GridOn as GridIcon,
  Groups as GroupsIcon,
  Shuffle as ShuffleIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import CreateContest from '../../components/contest/CreateContest';

export default function LandingPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  const [open, setOpen] = useState(false);

  const handleGetStarted = () => {
    if (auth.isAuthenticated) {
      setOpen(true);
    } else {
      auth.signinRedirect();
    }
  };

  const handleOnClose = (id: string) => {
    setOpen(false);

    if (id) {
      navigate(`/contests/${id}`);
    }
  };

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            🦃 Thanksgiving Squares
          </Typography>
          <Typography
            variant="h5"
            sx={{ mb: 4, color: 'text.secondary', maxWidth: 600, mx: 'auto' }}
          >
            The ultimate football squares game for your Thanksgiving gathering. Create contests,
            fill squares, and win big during the big game!
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{ px: 4, py: 2, fontSize: '1.1rem' }}
          >
            Create Your First Contest
          </Button>
        </Box>

        {/* How It Works Section */}
        <Paper elevation={3} sx={{ p: 4, mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
            How Thanksgiving Squares Works
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <Box sx={{ flex: 1, minWidth: 300 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                <GridIcon sx={{ mr: 2, mt: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6" gutterBottom>
                    1. Fill Out the Squares
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Participants choose and fill out squares on a 10x10 contest grid. Each square
                    represents a potential score combination.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                <ShuffleIcon sx={{ mr: 2, mt: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6" gutterBottom>
                    2. Randomize the Numbers
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Once all squares are filled, randomly assign numbers 0-9 to both the X and Y
                    axis representing each team.
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ flex: 1, minWidth: 300 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                <TrophyIcon sx={{ mr: 2, mt: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6" gutterBottom>
                    3. Determine Winners Each Quarter
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    At the end of each quarter, take the last digit of both teams' scores to find
                    the winning square.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                <GroupsIcon sx={{ mr: 2, mt: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6" gutterBottom>
                    4. Share and Collaborate
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Share your contest with friends and family. Everyone can see real-time updates
                    as squares are filled.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Example Section */}
        <Paper elevation={2} sx={{ p: 4, mb: 6, backgroundColor: 'background.default' }}>
          <Typography variant="h5" component="h3" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
            Example: How Winners Are Determined
          </Typography>

          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Game Situation:</strong> End of 1st Quarter
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Score:</strong> Home Team 14, Away Team 7
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Winning Square:</strong> Last digits are 4 (Home) and 7 (Away)
            </Typography>
            <Typography variant="body1" color="primary.main" sx={{ fontWeight: 'bold' }}>
              The person who owns the square at intersection (4,7) wins that quarter!
            </Typography>
          </Box>
        </Paper>

        {/* Features Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 4 }}>
            Why Choose Our Thanksgiving Squares?
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
            <Paper elevation={1} sx={{ p: 3, flex: '1 1 250px', maxWidth: 300 }}>
              <Typography variant="h6" gutterBottom>
                Real-time Updates
              </Typography>
              <Typography variant="body2" color="text.secondary">
                See changes instantly as players fill out squares
              </Typography>
            </Paper>

            <Paper elevation={1} sx={{ p: 3, flex: '1 1 250px', maxWidth: 300 }}>
              <Typography variant="h6" gutterBottom>
                Easy Sharing
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Share contests with a simple link - no accounts required for participants
              </Typography>
            </Paper>

            <Paper elevation={1} sx={{ p: 3, flex: '1 1 250px', maxWidth: 300 }}>
              <Typography variant="h6" gutterBottom>
                Mobile Friendly
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Works perfectly on phones, tablets, and computers
              </Typography>
            </Paper>

            <Paper elevation={1} sx={{ p: 3, flex: '1 1 250px', maxWidth: 300 }}>
              <Typography variant="h6" gutterBottom>
                Free to Use
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create unlimited contests for all your holiday gatherings
              </Typography>
            </Paper>
          </Box>
        </Box>

        {/* Call to Action */}
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h5" gutterBottom>
            Ready to Start Your Thanksgiving Squares Game?
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            Create your first contest in seconds and share it with your friends and family.
          </Typography>
          <Button variant="contained" size="large" onClick={handleGetStarted} sx={{ px: 6, py: 2 }}>
            Get Started Now
          </Button>
        </Box>
      </Container>

      <CreateContest open={open} onClose={handleOnClose} />
    </>
  );
}
