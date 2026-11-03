import { CheckCircle, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { Box, Button, ButtonBase, IconButton, Skeleton, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { fonts, game as palette } from '../../../../app/theme';
import TeamMark from '../../../../components/TeamMark';
import type { Game, Scoreboard, ScoreboardWeek } from '../../../../types/contest';
import {
  canStartBoard,
  formatKickoff,
  formatMatchup,
  gamesByDay,
  startBlockedReason,
} from '../../../../utils/game';

interface Props {
  board?: Scoreboard;
  loading: boolean;
  refreshing: boolean;
  failed: boolean;
  invalid: boolean;
  selectedId?: string;
  onRetry: () => void;
  onSelect: (game: Game) => void;
  onWeek: (week: ScoreboardWeek) => void;
}

const optionSx = (selected: boolean, blocked: boolean) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  textAlign: 'left',
  // ButtonBase centers its content, which shifts a card whose text is shorter than the card
  justifyContent: 'flex-start',
  alignItems: 'flex-start',
  gap: 1.25,
  width: '100%',
  p: 1.75,
  borderRadius: '14px',
  border: 1,
  borderColor: selected ? 'primary.main' : 'divider',
  bgcolor: selected ? alpha(palette.brand, 0.1) : 'background.default',
  opacity: blocked ? 0.5 : 1,
  transition: 'border-color 160ms, background-color 160ms',
  '&:hover': { borderColor: selected ? 'primary.main' : blocked ? 'divider' : palette.lineStrong },
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
  const blocked = !canStartBoard(game);

  return (
    <ButtonBase
      role="radio"
      aria-checked={selected}
      aria-disabled={blocked}
      aria-label={
        blocked ? `${formatMatchup(game)}, ${startBlockedReason(game)}` : formatMatchup(game)
      }
      disabled={blocked}
      onClick={onSelect}
      sx={optionSx(selected, blocked)}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
        <TeamMark abbr={game.awayAbbr} name={game.awayTeam} size={34} />
        <Typography sx={{ color: 'text.secondary', fontFamily: fonts.display, fontWeight: 700 }}>
          @
        </Typography>
        <TeamMark abbr={game.homeAbbr} name={game.homeTeam} size={34} />
        {selected && <CheckCircle color="primary" sx={{ ml: 'auto', fontSize: '1.2rem' }} />}
        {blocked && (
          <Typography
            component="span"
            sx={{
              ml: 'auto',
              px: 1,
              py: 0.25,
              borderRadius: 999,
              border: 1,
              borderColor: 'divider',
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            {startBlockedReason(game)}
          </Typography>
        )}
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

// the first and last game days of the week, like "Nov 5 – Nov 9"
function weekDates(games: Game[]): string {
  if (games.length === 0) {
    return '';
  }
  const day = (gameTime: string) =>
    new Date(gameTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const first = day(games[0].gameTime);
  const last = day(games[games.length - 1].gameTime);
  return first === last ? first : `${first} – ${last}`;
}

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
  gap: 1.25,
} as const;

export default function WeekGamePicker({
  board,
  loading,
  refreshing,
  failed,
  invalid,
  selectedId,
  onRetry,
  onSelect,
  onWeek,
}: Props) {
  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={52} sx={{ borderRadius: '14px', mb: 2 }} />
        <Box sx={gridSx}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={104} sx={{ borderRadius: '14px' }} />
          ))}
        </Box>
      </Box>
    );
  }

  if (failed || !board) {
    return (
      <Box role="alert" sx={{ textAlign: 'center', py: 3 }}>
        <Typography sx={{ fontWeight: 600 }}>Games are unavailable right now.</Typography>
        <Button onClick={onRetry} sx={{ mt: 1 }}>
          Try again
        </Button>
      </Box>
    );
  }

  const open = board.games.filter((game) => canStartBoard(game)).length;

  return (
    <Box>
      {/* the week being browsed, with the weeks either side */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 2,
          p: 0.75,
          borderRadius: '14px',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <IconButton
          aria-label="Previous week"
          onClick={() => board.previous && onWeek(board.previous)}
          disabled={!board.previous || refreshing}
        >
          <ChevronLeft />
        </IconButton>
        <Box sx={{ textAlign: 'center', minWidth: 0 }}>
          <Typography
            component="h3"
            sx={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: '1.25rem',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            {board.label || 'This Week'}
          </Typography>
          <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.8rem' }}>
            {[weekDates(board.games), `${open} open`].filter(Boolean).join(' · ')}
          </Typography>
        </Box>
        <IconButton
          aria-label="Next week"
          onClick={() => board.next && onWeek(board.next)}
          disabled={!board.next || refreshing}
        >
          <ChevronRight />
        </IconButton>
      </Box>

      {board.games.length === 0 ? (
        <Typography
          sx={{ color: 'text.secondary', fontSize: '0.9rem', textAlign: 'center', py: 3 }}
        >
          No games scheduled this week yet. New games appear as the NFL schedule is published.
        </Typography>
      ) : (
        <Box
          role="radiogroup"
          aria-label="Game"
          aria-invalid={invalid}
          aria-busy={refreshing}
          sx={{
            display: 'grid',
            gap: 2,
            maxHeight: { sm: 440 },
            overflowY: 'auto',
            pr: { sm: 0.5 },
            opacity: refreshing ? 0.6 : 1,
            transition: 'opacity 160ms',
          }}
        >
          {gamesByDay(board.games).map(([day, games]) => (
            <Box key={day} component="section" aria-label={day}>
              <Typography
                sx={{
                  mb: 1,
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                {day}
              </Typography>
              <Box sx={gridSx}>
                {games.map((game) => (
                  <GameOption
                    key={game.id}
                    game={game}
                    selected={game.id === selectedId}
                    onSelect={() => onSelect(game)}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
