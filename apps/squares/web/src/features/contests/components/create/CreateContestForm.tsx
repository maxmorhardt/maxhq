import { Lock, Public } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import { errorMessage } from '../../../../api/errors';
import type { ContestVisibility, Game } from '../../../../types/contest';
import { formatMatchup } from '../../../../utils/game';
import { stripDangerousChars } from '../../../../utils/sanitize';
import { useCreateContestMutation, useGetUpcomingGamesQuery } from '../../api';
import FormSection, { SectionDivider } from './FormSection';

// a linked game scores itself; a manual contest takes the teams and scores from the owner
type ScoringMode = 'game' | 'manual';

const NAME_MAX_LENGTH = 20;

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

export default function CreateContestForm() {
  const theme = useTheme();
  const navigate = useNavigate();
  const email = useAuth().user?.profile?.email;
  const { data: games = [], isLoading: gamesLoading } = useGetUpcomingGamesQuery();
  const [createContest, { isLoading: creating }] = useCreateContestMutation();

  const [form, setForm] = useState({ name: '', homeTeam: '', awayTeam: '' });
  const [visibility, setVisibility] = useState<ContestVisibility>('private');
  const [maxSquares, setMaxSquares] = useState(10);
  const [scoringMode, setScoringMode] = useState<ScoringMode>('game');
  const [gameId, setGameId] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: stripDangerousChars(value) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const isGameLinked = scoringMode === 'game';
    if (!form.name.trim()) {
      setError('Contest name is required');
      return;
    }
    if (!email) {
      setError('User is missing an email');
      return;
    }
    if (isGameLinked && !gameId) {
      setError('Select a game or switch to manual scoring');
      return;
    }

    setError('');
    try {
      const contest = await createContest({
        name: form.name.trim(),
        owner: email,
        homeTeam: isGameLinked ? undefined : form.homeTeam.trim() || undefined,
        awayTeam: isGameLinked ? undefined : form.awayTeam.trim() || undefined,
        visibility,
        maxSquares,
        gameId: isGameLinked ? gameId : undefined,
      }).unwrap();
      navigate(`/contests/${contest.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Error creating contest'));
    }
  };

  const gamePicker = gamesLoading ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
      <CircularProgress size={18} />
    </Box>
  ) : games.length > 0 ? (
    <FormControl fullWidth size="small" required disabled={creating}>
      <InputLabel>Game</InputLabel>
      <Select
        value={gameId}
        label="Game"
        required
        onChange={(e) => setGameId(e.target.value)}
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
  );

  const teamField = (name: 'homeTeam' | 'awayTeam', label: string) => (
    <TextField
      name={name}
      label={label}
      value={form[name]}
      onChange={handleInputChange}
      fullWidth
      size="small"
      disabled={creating}
      slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }}
    />
  );

  return (
    <Paper
      sx={{
        background: theme.palette.grey[900],
        border: `1px solid ${theme.palette.grey[800]}`,
        borderRadius: 3,
      }}
    >
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: { xs: 0, sm: 2 } }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <FormSection title="Basics" description="A short, recognizable name.">
            <TextField
              name="name"
              label="Contest Name"
              value={form.name}
              onChange={handleInputChange}
              fullWidth
              required
              size="small"
              disabled={creating}
              slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }}
            />
          </FormSection>

          <SectionDivider />

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
                onChange={(_, value: ScoringMode | null) => {
                  if (value) {
                    setScoringMode(value);
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
                gamePicker
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1.5,
                  }}
                >
                  {teamField('homeTeam', 'Home Team')}
                  {teamField('awayTeam', 'Away Team')}
                </Box>
              )}
            </Box>
          </FormSection>

          <SectionDivider />

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
              onChange={(_, value: ContestVisibility | null) => value && setVisibility(value)}
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
                aria-label="Max squares"
                value={maxSquares}
                onChange={(_, value) => setMaxSquares(value)}
                min={0}
                max={100}
                step={1}
                valueLabelDisplay="auto"
                disabled={creating}
              />
            </Box>
          </FormSection>

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
              disabled={creating}
              sx={{ color: 'rgba(255,255,255,0.7)' }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={creating} sx={{ minWidth: 160 }}>
              {creating ? <CircularProgress size={18} color="inherit" /> : 'Create Contest'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
