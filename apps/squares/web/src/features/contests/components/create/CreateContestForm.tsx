import { CheckCircle, Lock, Public } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Slider,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import { errorMessage } from '../../../../api/errors';
import { fonts, game as palette } from '../../../../app/theme';
import TeamMark from '../../../../components/TeamMark';
import type { ContestVisibility, Game } from '../../../../types/contest';
import { formatKickoff, formatMatchup } from '../../../../utils/game';
import { stripDangerousChars } from '../../../../utils/sanitize';
import { useGetUpcomingGamesQuery } from '../../../games/api';
import { useCreateContestMutation } from '../../api';
import FormSection from './FormSection';

const NAME_MAX_LENGTH = 20;

const visibilityOptions: {
  value: ContestVisibility;
  label: string;
  body: string;
  icon: ReactNode;
}[] = [
  {
    value: 'private',
    label: 'Private',
    body: 'Invite-only. Hidden from anyone who is not in it.',
    icon: <Lock fontSize="small" />,
  },
  {
    value: 'public',
    label: 'Public',
    body: 'Anyone with the link can watch. Only invited players claim squares.',
    icon: <Public fontSize="small" />,
  },
];

const optionSx = (selected: boolean) => ({
  position: 'relative',
  display: 'flex',
  textAlign: 'left',
  // ButtonBase centers its content, which shifts a card whose text is shorter than the card
  justifyContent: 'flex-start',
  alignItems: 'flex-start',
  gap: 1.5,
  width: '100%',
  p: 1.75,
  borderRadius: '14px',
  border: 1,
  borderColor: selected ? 'primary.main' : 'divider',
  bgcolor: selected ? alpha(palette.brand, 0.1) : 'background.default',
  transition: 'border-color 160ms, background-color 160ms',
  '&:hover': { borderColor: selected ? 'primary.main' : palette.lineStrong },
});

function GameOption({
  game,
  selected,
  onSelect,
}: {
  game: Game;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <ButtonBase
      role="radio"
      aria-checked={selected}
      aria-label={formatMatchup(game)}
      onClick={onSelect}
      sx={{ ...optionSx(selected), flexDirection: 'column', gap: 1.25 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
        <TeamMark abbr={game.awayAbbr} name={game.awayTeam} size={34} />
        <Typography sx={{ color: 'text.secondary', fontFamily: fonts.display, fontWeight: 700 }}>
          @
        </Typography>
        <TeamMark abbr={game.homeAbbr} name={game.homeTeam} size={34} />
        {selected && <CheckCircle color="primary" sx={{ ml: 'auto', fontSize: '1.2rem' }} />}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 600, fontSize: '0.92rem', lineHeight: 1.3 }}>
          {formatMatchup(game)}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 0.25 }}>
          {formatKickoff(game.gameTime)}
        </Typography>
      </Box>
    </ButtonBase>
  );
}

export default function CreateContestForm() {
  const navigate = useNavigate();
  const email = useAuth().user?.profile?.email;
  const { data: games = [], isLoading: gamesLoading } = useGetUpcomingGamesQuery();
  const [createContest, { isLoading: creating }] = useCreateContestMutation();

  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<ContestVisibility>('private');
  const [maxSquares, setMaxSquares] = useState(10);
  const [gameId, setGameId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ game?: string; name?: string }>({});
  const [error, setError] = useState('');

  const gameSection = useRef<HTMLElement>(null);
  const nameSection = useRef<HTMLElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const selectedGame = games.find((g) => g.id === gameId);

  const pickGame = (game: Game) => {
    setGameId(game.id);
    setFieldErrors((errors) => ({ ...errors, game: undefined }));
  };

  // every problem shows on its own step; the first one is brought into view and focused
  const validate = () => {
    const errors = {
      game: gameId ? undefined : 'Pick the game this contest is played on',
      name: name.trim() ? undefined : 'Contest name is required',
    };
    setFieldErrors(errors);

    const first = errors.game ? gameSection.current : errors.name ? nameSection.current : null;
    if (!first) {
      return true;
    }
    first.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    if (errors.game) {
      first.querySelector<HTMLElement>('[role="radio"]')?.focus({ preventScroll: true });
    } else {
      nameInput.current?.focus({ preventScroll: true });
    }
    return false;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }
    if (!email) {
      setError('User is missing an email');
      return;
    }

    setError('');
    try {
      const contest = await createContest({
        name: name.trim(),
        owner: email,
        visibility,
        maxSquares,
        gameId,
      }).unwrap();
      navigate(`/contests/${contest.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Error creating contest'));
    }
  };

  const gamePicker = gamesLoading ? (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
      <CircularProgress size={22} />
    </Box>
  ) : games.length > 0 ? (
    <Box
      role="radiogroup"
      aria-label="Game"
      aria-invalid={Boolean(fieldErrors.game)}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        gap: 1.25,
        maxHeight: { sm: 360 },
        overflowY: 'auto',
        pr: { sm: 0.5 },
      }}
    >
      {games.map((g) => (
        <GameOption key={g.id} game={g} selected={g.id === gameId} onSelect={() => pickGame(g)} />
      ))}
    </Box>
  ) : (
    <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
      No upcoming games available yet. New games appear here as the NFL schedule is published.
    </Typography>
  );

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 300px' },
        gap: { xs: 3, md: 4 },
        alignItems: 'start',
      }}
    >
      <Box sx={{ display: 'grid', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <FormSection
          ref={gameSection}
          step={1}
          error={fieldErrors.game}
          title="Pick the game"
          description="The contest starts at kickoff, and every quarter winner comes from the live score."
        >
          {gamePicker}
        </FormSection>

        <FormSection
          ref={nameSection}
          step={2}
          title="Name it"
          description="Short and easy to spot in the list."
        >
          <TextField
            name="name"
            label="Contest Name"
            value={name}
            inputRef={nameInput}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setName(stripDangerousChars(e.target.value));
              setFieldErrors((errors) => ({ ...errors, name: undefined }));
            }}
            fullWidth
            required
            disabled={creating}
            error={Boolean(fieldErrors.name)}
            helperText={fieldErrors.name ?? `${name.length}/${NAME_MAX_LENGTH}`}
            slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }}
          />
        </FormSection>

        <FormSection step={3} title="Who can see it">
          <Box
            role="radiogroup"
            aria-label="Visibility"
            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}
          >
            {visibilityOptions.map((option) => (
              <ButtonBase
                key={option.value}
                role="radio"
                aria-checked={visibility === option.value}
                aria-label={option.label}
                onClick={() => setVisibility(option.value)}
                sx={optionSx(visibility === option.value)}
              >
                <Box
                  sx={{
                    color: visibility === option.value ? 'primary.main' : 'text.secondary',
                    mt: 0.25,
                  }}
                >
                  {option.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{option.label}</Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', mt: 0.25 }}>
                    {option.body}
                  </Typography>
                </Box>
              </ButtonBase>
            ))}
          </Box>
        </FormSection>

        <FormSection
          step={4}
          title="Your squares"
          description="How many squares you can claim yourself. Invite links set everyone else's."
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 1 }}>
            <Slider
              aria-label="Max squares"
              value={maxSquares}
              onChange={(_, value) => setMaxSquares(value)}
              min={0}
              max={100}
              step={1}
              disabled={creating}
              sx={{ flex: 1 }}
            />
            <Typography
              sx={{
                minWidth: '3ch',
                textAlign: 'right',
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: '2rem',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {maxSquares}
            </Typography>
          </Box>
        </FormSection>
      </Box>

      {/* the contest as it will be created, with the actions beside it */}
      <Box
        sx={{
          position: { md: 'sticky' },
          top: { md: 96 },
          p: 2.5,
          borderRadius: '18px',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            fontSize: '0.82rem',
          }}
        >
          Your contest
        </Typography>
        <Typography
          sx={{
            mt: 1,
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: '1.8rem',
            lineHeight: 1,
            textTransform: 'uppercase',
            overflowWrap: 'anywhere',
            color: name.trim() ? 'text.primary' : 'text.secondary',
          }}
        >
          {name.trim() || 'Untitled'}
        </Typography>

        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: '12px',
            bgcolor: 'background.default',
            border: 1,
            borderColor: 'divider',
          }}
        >
          {selectedGame ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <TeamMark abbr={selectedGame.awayAbbr} name={selectedGame.awayTeam} size={36} />
                <Typography
                  sx={{ fontFamily: fonts.display, fontWeight: 700, color: 'text.secondary' }}
                >
                  AT
                </Typography>
                <TeamMark abbr={selectedGame.homeAbbr} name={selectedGame.homeTeam} size={36} />
              </Box>
              <Typography
                sx={{ mt: 1, textAlign: 'center', fontSize: '0.82rem', color: 'text.secondary' }}
              >
                {formatKickoff(selectedGame.gameTime)}
              </Typography>
            </>
          ) : (
            <Typography
              sx={{ textAlign: 'center', fontSize: '0.85rem', color: 'text.secondary', py: 1 }}
            >
              No game picked yet
            </Typography>
          )}
        </Box>

        <Box
          component="dl"
          sx={{
            m: 0,
            mt: 2,
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            rowGap: 0.75,
            columnGap: 2,
          }}
        >
          <Typography component="dt" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
            Visibility
          </Typography>
          <Typography
            component="dd"
            sx={{ m: 0, textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}
          >
            {visibility === 'private' ? 'Private' : 'Public'}
          </Typography>
          <Typography component="dt" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
            Your squares
          </Typography>
          <Typography
            component="dd"
            sx={{ m: 0, textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}
          >
            {maxSquares} of 100
          </Typography>
        </Box>

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={creating}
          sx={{ mt: 2.5 }}
        >
          {creating ? <CircularProgress size={20} color="inherit" /> : 'Create Contest'}
        </Button>
        <Button
          type="button"
          fullWidth
          onClick={() => navigate('/contests')}
          disabled={creating}
          sx={{ mt: 1, color: 'text.secondary' }}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
