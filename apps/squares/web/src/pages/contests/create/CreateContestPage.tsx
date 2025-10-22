import { ArrowBack, EmojiEvents, Groups } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import FormCard from '../../../components/common/FormCard';
import { selectContestLoading } from '../../../features/contests/contestSelectors';
import { clearError } from '../../../features/contests/contestSlice';
import { createContest } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import type { APIError } from '../../../types/error';
import { gradients } from '../../../types/gradients';

const infoCards = [
  {
    icon: <EmojiEvents sx={{ mr: 2, color: '#ffd700' }} />,
    title: "What's Next?",
    details:
      "After creating your contest, you'll be able to customize the grid, set entry fees, and invite participants to join.",
  },
  {
    icon: <Groups sx={{ mr: 2, color: '#f093fb' }} />,
    title: 'Share & Invite',
    details:
      'Once created, you can share your contest link with friends and colleagues to get them involved.',
  },
];

export default function CreateContestPage() {
  const theme = useTheme();
  const auth = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const loading = useAppSelector(selectContestLoading);

  const [formData, setFormData] = useState({
    name: '',
    homeTeam: '',
    awayTeam: '',
  });
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Contest name is required');
      return;
    }

    if (!auth.isAuthenticated || !auth.user) {
      setError('You must be logged in to create a contest');
      return;
    }

    if (!auth.user?.profile?.preferred_username) {
      setError('User is missing a username');
      return;
    }

    setError('');

    try {
      const contest = await dispatch(
        createContest({
          name: formData.name.trim(),
          owner: auth.user.profile.preferred_username,
          homeTeam: formData.homeTeam.trim() || undefined,
          awayTeam: formData.awayTeam.trim() || undefined,
        })
      ).unwrap();

      navigate(`/contests/${contest.id}`);
    } catch (err: unknown) {
      const apiError = err as APIError;
      setError(apiError.message);
      dispatch(clearError());
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* header */}
      <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 4 } }}>
        <Typography
          sx={{
            fontWeight: 700,
            mb: 2,
            background: gradients.textGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: { xs: '2rem', sm: '3rem' },
          }}
        >
          Create New Contest
        </Typography>
        <Typography
          sx={{
            color: 'white',
            opacity: 0.8,
            maxWidth: 600,
            mx: 'auto',
            fontSize: { xs: '0.9rem', sm: '1.1rem' },
          }}
        >
          Set up your squares contest in minutes. Add teams, customize settings, and invite
          participants to join the fun.
        </Typography>
      </Box>

      {/* back button */}
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/contests')}
          sx={{
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          Back to Contests
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 4,
        }}
      >
        {/* form */}
        <Paper
          sx={{
            p: 4,
            background: theme.palette.grey[900],
            border: `1px solid ${theme.palette.grey[800]}`,
            borderRadius: 3,
          }}
        >
          <Typography sx={{ mb: 2, fontWeight: 600, fontSize: { xs: '1.1rem', sm: '2.1rem' } }}>
            Contest Details
          </Typography>

          {!auth.isAuthenticated && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              You must be logged in to create a contest. Please sign in to continue.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              name="name"
              label="Contest Name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              required
              disabled={loading}
              placeholder="e.g., Super Bowl 2025, Office Pool, Championship Game"
            />

            <TextField
              name="homeTeam"
              label="Home Team (Optional)"
              value={formData.homeTeam}
              onChange={handleInputChange}
              fullWidth
              disabled={loading}
              placeholder="e.g., Chiefs, Cowboys, Patriots"
            />

            <TextField
              name="awayTeam"
              label="Away Team (Optional)"
              value={formData.awayTeam}
              onChange={handleInputChange}
              fullWidth
              disabled={loading}
              placeholder="e.g., Bills, Packers, Steelers"
            />

            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button
                type="button"
                variant="outlined"
                onClick={() => navigate('/contests')}
                disabled={loading}
                sx={{
                  flex: 1,
                  py: 1.5,
                  borderColor: gradients.background,
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !auth.isAuthenticated}
                sx={{
                  flex: 2,
                  py: 1.5,
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                  </Box>
                ) : (
                  ''
                )}
                Create Contest
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* info cards */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, sm: 2, md: 2, lg: 4 },
            alignSelf: 'center',
          }}
        >
          {infoCards.map((card) => (
            <FormCard key={card.title} icon={card.icon} title={card.title} details={card.details} />
          ))}
        </Box>
      </Box>
    </Container>
  );
}
