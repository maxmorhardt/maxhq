import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { EmojiEvents, SportsSoccer, Groups, Add, ArrowBack } from '@mui/icons-material';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import { selectContestLoading } from '../../../features/contests/contestSelectors';
import { createContest } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import type { APIError } from '../../../types/error';

export default function CreateContestPage() {
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

    setError('');

    try {
      const contest = await dispatch(
        createContest({
          name: formData.name.trim(),
          homeTeam: formData.homeTeam.trim() || undefined,
          awayTeam: formData.awayTeam.trim() || undefined,
        })
      ).unwrap();

      // Navigate to the new contest
      navigate(`/contests/${contest.id}`);
    } catch (err: unknown) {
      const apiError = err as APIError;
      setError(apiError.message);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Add sx={{ fontSize: 40, color: 'white' }} />
          </Box>
        </Box>
        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            mb: 2,
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Create New Contest
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 600,
            mx: 'auto',
            lineHeight: 1.6,
          }}
        >
          Set up your squares contest in minutes. Add teams, customize settings, and invite
          participants to join the fun.
        </Typography>
      </Box>

      {/* Back Button */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/contests')}
          sx={{
            color: 'rgba(255,255,255,0.7)',
            '&:hover': {
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.1)',
            },
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
        {/* Main Form */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
          }}
        >
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
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
            sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255,255,255,0.05)',
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255,255,255,0.7)',
                },
                '& .MuiOutlinedInput-input': {
                  color: 'white',
                },
              }}
            />

            <TextField
              name="homeTeam"
              label="Home Team (Optional)"
              value={formData.homeTeam}
              onChange={handleInputChange}
              fullWidth
              disabled={loading}
              placeholder="e.g., Chiefs, Cowboys, Patriots"
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255,255,255,0.05)',
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255,255,255,0.7)',
                },
                '& .MuiOutlinedInput-input': {
                  color: 'white',
                },
              }}
            />

            <TextField
              name="awayTeam"
              label="Away Team (Optional)"
              value={formData.awayTeam}
              onChange={handleInputChange}
              fullWidth
              disabled={loading}
              placeholder="e.g., Bills, Packers, Steelers"
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255,255,255,0.05)',
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255,255,255,0.7)',
                },
                '& .MuiOutlinedInput-input': {
                  color: 'white',
                },
              }}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="button"
                variant="outlined"
                onClick={() => navigate('/contests')}
                disabled={loading}
                sx={{
                  flex: 1,
                  py: 1.5,
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  },
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
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  },
                  '&:disabled': {
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.3)',
                  },
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={18} color="inherit" />
                    Creating...
                  </Box>
                ) : (
                  'Create Contest'
                )}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Info Cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card
            sx={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmojiEvents sx={{ mr: 2, color: '#ffd700' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  What's Next?
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                After creating your contest, you'll be able to customize the grid, set entry fees,
                and invite participants to join.
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SportsSoccer sx={{ mr: 2, color: '#4facfe' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Team Names
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                Team names are optional but help participants identify with the game. You can always
                add or change them later.
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Groups sx={{ mr: 2, color: '#f093fb' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Share & Invite
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                Once created, you can share your contest link with friends and colleagues to get
                them involved.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}
