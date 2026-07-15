import { ArrowBack, Lock, Public } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { stripDangerousChars } from '../../../utils/sanitize';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import { selectContestLoading } from '../../../features/contests/contestSelectors';
import { clearError } from '../../../features/contests/contestSlice';
import { createContest, fetchUpcomingGames } from '../../../features/contests/contestThunks';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import type { APIError } from '../../../types/error';
import type { ContestVisibility, Game } from '../../../types/contest';
import { gradients } from '../../../types/gradients';
import { formatMatchup } from '../../../utils/game';
import { Helmet } from 'react-helmet-async';
import { useAxiosAuth } from '../../../hooks/useAxiosAuth';

type ScoringMode = 'game' | 'manual';

export default function CreateContestPage() {
  const theme = useTheme();
  const auth = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const axiosReady = useAxiosAuth();

  const loading = useAppSelector(selectContestLoading);

  const [formData, setFormData] = useState({
    name: '',
    homeTeam: '',
    awayTeam: '',
  });
  const [visibility, setVisibility] = useState<ContestVisibility>('private');
  const [maxSquares, setMaxSquares] = useState<number>(10);
  const [error, setError] = useState('');

  // scoring mode: link to a live game (default) or enter scores manually
  const [scoringMode, setScoringMode] = useState<ScoringMode>('game');
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [gamesLoading, setGamesLoading] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated || !axiosReady) {
      return;
    }

    let active = true;
    setGamesLoading(true);
    dispatch(fetchUpcomingGames())
      .unwrap()
      .then((g) => {
        if (active) setGames(g);
      })
      .catch(() => {
        if (active) setGames([]);
      })
      .finally(() => {
        if (active) setGamesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [auth.isAuthenticated, axiosReady, dispatch]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: stripDangerousChars(value) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Contest name is required');
      return;
    }

    if (!auth.isAuthenticated || !auth.user) {
      setError('You must be logged in to create a contest');
      return;
    }

    if (!auth.user?.profile?.email) {
      setError('User is missing an email');
      return;
    }

    const isGameLinked = scoringMode === 'game';
    if (isGameLinked && !selectedGameId) {
      setError('Select a game or switch to manual scoring');
      return;
    }

    setError('');

    try {
      const contest = await dispatch(
        createContest({
          name: formData.name.trim(),
          owner: auth.user.profile.email,
          // a game-linked contest takes its teams from the game; manual uses the inputs
          homeTeam: isGameLinked ? undefined : formData.homeTeam.trim() || undefined,
          awayTeam: isGameLinked ? undefined : formData.awayTeam.trim() || undefined,
          visibility,
          maxSquares,
          gameId: isGameLinked ? selectedGameId : undefined,
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
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 }, mb: 2.5 }}>
      <Helmet>
        <title>Create Contest – Squares</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
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
            <Alert severity="warning" sx={{ mb: { xs: 0, sm: 2 } }}>
              You must be logged in to create a contest.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: { xs: 0, sm: 2 } }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            {/* basics */}
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

            {/* matchup: link a live game (auto scores) or enter teams manually */}
            <FormSection
              title="Matchup"
              description={
                scoringMode === 'game'
                  ? 'Scores update automatically from the linked NFL game.'
                  : 'Enter the matchup and record scores yourself each quarter.'
              }
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <ToggleButtonGroup
                  value={scoringMode}
                  exclusive
                  onChange={(_, val) => {
                    if (val) {
                      setScoringMode(val as ScoringMode);
                      setError('');
                    }
                  }}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="game">Live Game</ToggleButton>
                  <ToggleButton value="manual">Manual</ToggleButton>
                </ToggleButtonGroup>

                {scoringMode === 'game' ? (
                  gamesLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                      <CircularProgress size={18} />
                    </Box>
                  ) : games.length > 0 ? (
                    <FormControl fullWidth size="small" required disabled={loading}>
                      <InputLabel>Game</InputLabel>
                      <Select
                        value={selectedGameId}
                        label="Game"
                        required
                        onChange={(e) => setSelectedGameId(e.target.value)}
                        MenuProps={{
                          slotProps: {
                            paper: {
                              sx: {
                                maxHeight: { xs: 250, sm: 300 },
                                '& .MuiMenuItem-root': {
                                  fontSize: { xs: 12, sm: 13, md: 14 },
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                },
                              },
                            },
                          },
                        }}
                      >
                        {games.map((game) => (
                          <MenuItem key={game.id} value={game.id}>
                            {gameLabel(game)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
                      No upcoming games available. Switch to Manual to enter the matchup yourself.
                    </Typography>
                  )
                ) : (
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
                )}
              </Box>
            </FormSection>

            <SectionDivider />

            {/* visibility */}
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

            {/* owner squares */}
            <FormSection
              title="Your Squares"
              description="Maximum squares you can claim. Counts toward the 100-square total."
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
                  min={0}
                  max={100}
                  step={1}
                  valueLabelDisplay="auto"
                  disabled={loading}
                />
              </Box>
            </FormSection>

            {/* footer actions */}
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
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: '140px minmax(0, 1fr)' },
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
      <Box sx={{ minWidth: 0 }}>{children}</Box>
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

function gameLabel(game: Game): string {
  const kickoff = game.gameTime
    ? new Date(game.gameTime).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';
  return `${formatMatchup(game)}${kickoff ? ` · ${kickoff}` : ''}`;
}
