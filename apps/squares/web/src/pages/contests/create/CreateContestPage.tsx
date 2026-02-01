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
import { useState, type ChangeEvent, type FormEvent } from 'react';
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

// create contest page with form and info cards
export default function CreateContestPage() {
  const theme = useTheme();
  const auth = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const loading = useAppSelector(selectContestLoading);

  // form state for contest name and team names
  const [formData, setFormData] = useState({
    name: '',
    homeTeam: '',
    awayTeam: '',
  });
  const [error, setError] = useState('');

  // update form data on input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // validate and submit contest creation form
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // validate contest name
    if (!formData.name.trim()) {
      setError('Contest name is required');
      return;
    }

    // validate user is authenticated
    if (!auth.isAuthenticated || !auth.user) {
      setError('You must be logged in to create a contest');
      return;
    }

    if (!auth.user?.profile?.preferred_username) {
      setError('User is missing a username');
      return;
    }

    setError('');

    // create contest and navigate to contest page on success
    try {
      const contest = await dispatch(
        createContest({
          name: formData.name.trim(),
          owner: auth.user.profile.preferred_username,
          homeTeam: formData.homeTeam.trim() || undefined,
          awayTeam: formData.awayTeam.trim() || undefined,
        })
      ).unwrap();

      navigate(`/contests/owner/${contest.owner}/name/${contest.name}`);
    } catch (err: unknown) {
      const apiError = err as APIError;
      setError(apiError.message);
      dispatch(clearError());
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* page header with title and description */}
      <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 4 } }}>
        <Typography
          sx={{
            fontWeight: 700,
            mb: 2,
            background: gradients.textGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: { xs: '1.5rem', sm: '2rem' },
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

      {/* back to contests button */}
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

      {/* form and info cards grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 4,
        }}
      >
        {/* contest creation form with validation */}
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
              slotProps={{ htmlInput: { maxLength: 20 } }}
            />

            <TextField
              name="homeTeam"
              label="Home Team (Optional)"
              value={formData.homeTeam}
              onChange={handleInputChange}
              fullWidth
              disabled={loading}
              placeholder="e.g., Chiefs, Cowboys, Patriots"
              slotProps={{ htmlInput: { maxLength: 20 } }}
            />

            <TextField
              name="awayTeam"
              label="Away Team (Optional)"
              value={formData.awayTeam}
              onChange={handleInputChange}
              fullWidth
              disabled={loading}
              placeholder="e.g., Bills, Packers, Steelers"
              slotProps={{ htmlInput: { maxLength: 20 } }}
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
                {loading ? <CircularProgress size={18} color="inherit" /> : 'Create Contest'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* info cards explaining next steps */}
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
