import { ArrowBack, Lock, Public } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { stripDangerousChars } from '../../../utils/sanitize';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import { selectContestLoading } from '../../../features/contests/contestSelectors';
import { clearError } from '../../../features/contests/contestSlice';
import { createContest } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import type { APIError } from '../../../types/error';
import type { ContestVisibility } from '../../../types/contest';
import { gradients } from '../../../types/gradients';

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
  const [visibility, setVisibility] = useState<ContestVisibility>('private');
  const [maxSquares, setMaxSquares] = useState<number>(10);
  const [error, setError] = useState('');

  // update form data on input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: stripDangerousChars(value) }));
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
          visibility,
          maxSquares,
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
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
      {/* page header with title and description */}
      <Box sx={{ textAlign: 'center', mb: { xs: 1.5, sm: 2 } }}>
        <Typography
          sx={{
            fontWeight: 700,
            mb: 1,
            background: gradients.textGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: { xs: '1.5rem', sm: '1.85rem' },
          }}
        >
          Create New Contest
        </Typography>
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 560,
            mx: 'auto',
            fontSize: { xs: '0.85rem', sm: '0.95rem' },
          }}
        >
          Set up your squares contest in minutes.
        </Typography>
      </Box>

      {/* back to contests button */}
      <Box sx={{ mb: 1 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/contests')}
          size="small"
          sx={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.85rem',
          }}
        >
          Back to Contests
        </Button>
      </Box>

      {/* contest creation form with validation */}
      <Paper
        sx={{
          background: theme.palette.grey[900],
          border: `1px solid ${theme.palette.grey[800]}`,
          borderRadius: 3,
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {!auth.isAuthenticated && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              You must be logged in to create a contest.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            {/* Section: Basics */}
            <FormSection title="Basics" description="A short, recognizable name.">
              <TextField
                name="name"
                label="Contest Name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
                size="small"
                disabled={loading}
                slotProps={{ htmlInput: { maxLength: 20 } }}
              />
            </FormSection>

            <SectionDivider />

            {/* Section: Teams */}
            <FormSection title="Teams" description="Optional matchup shown on the grid.">
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1.5,
                }}
              >
                <TextField
                  name="homeTeam"
                  label="Home Team"
                  value={formData.homeTeam}
                  onChange={handleInputChange}
                  fullWidth
                  size="small"
                  disabled={loading}
                  slotProps={{ htmlInput: { maxLength: 20 } }}
                />

                <TextField
                  name="awayTeam"
                  label="Away Team"
                  value={formData.awayTeam}
                  onChange={handleInputChange}
                  fullWidth
                  size="small"
                  disabled={loading}
                  slotProps={{ htmlInput: { maxLength: 20 } }}
                />
              </Box>
            </FormSection>

            <SectionDivider />

            {/* Section: Visibility */}
            <FormSection
              title="Visibility"
              description={
                visibility === 'private'
                  ? 'Invite-only. Hidden from non-participants.'
                  : 'Anyone can view. Only invited participants can claim squares.'
              }
            >
              <ToggleButtonGroup
                value={visibility}
                exclusive
                onChange={(_, val) => {
                  if (val) setVisibility(val as ContestVisibility);
                }}
                fullWidth
                size="small"
              >
                <ToggleButton value="private">
                  <Lock sx={{ mr: 0.75, fontSize: '1rem' }} />
                  Private
                </ToggleButton>
                <ToggleButton value="public">
                  <Public sx={{ mr: 0.75, fontSize: '1rem' }} />
                  Public
                </ToggleButton>
              </ToggleButtonGroup>
            </FormSection>

            <SectionDivider />

            {/* Section: Owner Squares */}
            <FormSection
              title="Your Squares"
              description={`Maximum squares you can claim. Counts toward the 100-square total.`}
            >
              <Box sx={{ px: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    mb: 0.5,
                  }}
                >
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                    Max squares
                  </Typography>
                  <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                    {maxSquares}
                  </Typography>
                </Box>
                <Slider
                  value={maxSquares}
                  onChange={(_, val) => setMaxSquares(val as number)}
                  min={1}
                  max={100}
                  step={1}
                  valueLabelDisplay="auto"
                  disabled={loading}
                />
              </Box>
            </FormSection>

            {/* Footer actions */}
            <Box
              sx={{
                mt: 3,
                pt: 2,
                borderTop: `1px solid ${theme.palette.grey[800]}`,
                display: 'flex',
                gap: 1.5,
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <Button
                type="button"
                variant="text"
                onClick={() => navigate('/contests')}
                disabled={loading}
                sx={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !auth.isAuthenticated}
                sx={{ minWidth: 160 }}
              >
                {loading ? <CircularProgress size={18} color="inherit" /> : 'Create Contest'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' },
        columnGap: { sm: 3 },
        rowGap: 0.75,
        py: 1.5,
      }}
    >
      <Box>
        <Typography
          sx={{
            color: 'white',
            fontWeight: 600,
            fontSize: '0.95rem',
            mb: 0.5,
          }}
        >
          {title}
        </Typography>
        {description && (
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: '0.78rem',
              lineHeight: 1.5,
            }}
          >
            {description}
          </Typography>
        )}
      </Box>
      <Box>{children}</Box>
    </Box>
  );
}

function SectionDivider() {
  return (
    <Box
      sx={{
        height: '1px',
        background:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
      }}
    />
  );
}
