import { Lock, Public } from '@mui/icons-material';
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
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { errorMessage, errorStatus } from '../../../../api/errors';
import { fonts } from '../../../../app/theme';
import TeamMark from '../../../../components/TeamMark';
import { skipToken } from '@reduxjs/toolkit/query';
import type {
  ContestVisibility,
  Game,
  ScoreboardQuery,
  ScoreboardWeek,
} from '../../../../types/contest';
import { canStartBoard, formatKickoff } from '../../../../utils/game';
import { isUuid } from '../../../../utils/ids';
import { stripDangerousChars } from '../../../../utils/sanitize';
import { useGetGameQuery, useGetScoreboardQuery } from '../../../games/api';
import { useCreateContestMutation } from '../../api';
import FormSection from './FormSection';
import { optionSx } from './optionSx';
import WeekGamePicker from './WeekGamePicker';
import { trackConversion } from '../../../../utils/googleAds';

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

export default function CreateContestForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // a "start a board for this game" link arrives with the game picked, while it can still be picked
  const linkParam = searchParams.get('game');
  const requestedId = linkParam && isUuid(linkParam) ? linkParam : null;
  const { data: requested, isLoading: requestedLoading } = useGetGameQuery(
    requestedId ?? skipToken
  );

  // judged once, when it loads, so it stays picked through kickoff like a game picked by hand
  const [linked, setLinked] = useState<Game | null>();
  if (linked === undefined && requested) {
    setLinked(canStartBoard(requested) ? requested : null);
  }

  // the picker opens on the linked game's week, else the next kickoff's, so a spent week hands over by itself
  const [week, setWeek] = useState<ScoreboardWeek>();
  const openingWeek: ScoreboardQuery =
    linked && linked.week > 0
      ? { season: linked.season, seasonType: linked.seasonType, week: linked.week }
      : { upcoming: true };
  const {
    data: board,
    isLoading: boardLoading,
    isFetching: boardFetching,
    isError: boardFailed,
    refetch: refetchBoard,
  } = useGetScoreboardQuery(week ?? openingWeek, { skip: requestedLoading });
  const [createContest, { isLoading: creating }] = useCreateContestMutation();

  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<ContestVisibility>('private');
  const [maxSquares, setMaxSquares] = useState(10);
  // undefined until the player picks, so a linked game stays picked until then
  const [picked, setPicked] = useState<Game | null>();
  const [fieldErrors, setFieldErrors] = useState<{ game?: string; name?: string }>({});
  const [error, setError] = useState('');

  const gameSection = useRef<HTMLElement>(null);
  const nameSection = useRef<HTMLElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const selectedGame = picked === undefined ? (linked ?? undefined) : picked;

  const pickGame = (game: Game) => {
    setPicked(game);
    setFieldErrors((errors) => ({ ...errors, game: undefined }));
  };

  const focusField = (field: 'game' | 'name') => {
    const section = field === 'game' ? gameSection.current : nameSection.current;
    section?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    if (field === 'game') {
      section
        ?.querySelector<HTMLElement>('[role="radio"]:not([aria-disabled="true"])')
        ?.focus({ preventScroll: true });
    } else {
      nameInput.current?.focus({ preventScroll: true });
    }
  };

  // every problem shows on its own step; the first one is brought into view and focused
  const validate = () => {
    const errors = {
      game: selectedGame ? undefined : 'Pick the game this contest is played on',
      name: name.trim() ? undefined : 'Contest name is required',
    };

    setFieldErrors(errors);

    if (errors.game || errors.name) {
      focusField(errors.game ? 'game' : 'name');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate() || !selectedGame) {
      return;
    }

    setError('');
    try {
      const contest = await createContest({
        name: name.trim(),
        visibility,
        maxSquares,
        gameId: selectedGame.id,
      }).unwrap();
      trackConversion('contestCreated');
      navigate(`/contests/${contest.id}`);
    } catch (err) {
      // the form sat open until the game was past the first quarter
      if (errorStatus(err) === 409) {
        setPicked(null);
        setFieldErrors({ game: errorMessage(err, 'That game is past the first quarter') });
        focusField('game');
        void refetchBoard();
        return;
      }
      setError(errorMessage(err, 'Error creating contest'));
    }
  };

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
          description="Browse the schedule week by week. The contest starts at kickoff, and every quarter winner comes from the live score."
        >
          <WeekGamePicker
            board={board}
            loading={requestedLoading || boardLoading}
            refreshing={boardFetching && !boardLoading}
            failed={boardFailed}
            invalid={Boolean(fieldErrors.game)}
            selectedId={selectedGame?.id}
            onRetry={() => void refetchBoard()}
            onSelect={pickGame}
            onWeek={setWeek}
            onReset={week ? () => setWeek(undefined) : undefined}
          />
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
