import { CheckCircle } from '@mui/icons-material';
import { Box, Button, ButtonBase, Skeleton, Typography } from '@mui/material';
import { fonts } from '../../../../app/theme';
import TeamMark from '../../../../components/TeamMark';
import type { Game, Scoreboard, ScoreboardWeek } from '../../../../types/contest';
import {
  canStartBoard,
  formatKickoff,
  formatMatchup,
  gamesByDay,
  startBlockedReason,
} from '../../../../utils/game';
import WeekBar, { WeekBarSkeleton } from '../../../games/components/WeekBar';
import { optionSx } from './optionSx';

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
  // set once the player has stepped away from the week the picker opened on
  onReset?: () => void;
}

function GameOption({
  game,
  selected,
  onSelect,
}: {
  game: Game;
  selected: boolean;
  onSelect: () => void;
}) {
  // the picked game stays picked even if it kicks off while the form is open; the server has a grace period
  const blocked = !selected && !canStartBoard(game);

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
      sx={{ ...optionSx(selected, blocked), flexDirection: 'column', gap: 1.25 }}
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

const noteSx = { color: 'text.secondary', fontSize: '0.9rem', textAlign: 'center', py: 3 } as const;

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
  onReset,
}: Props) {
  if (loading) {
    return (
      <Box aria-busy>
        <WeekBarSkeleton compact />
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
        <Typography sx={{ fontWeight: 600 }}>This week&apos;s games didn&apos;t load.</Typography>
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1 }}>
          <Button onClick={onRetry}>Try again</Button>
          {onReset && (
            <Button onClick={onReset} color="inherit">
              Back to this week
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  const open = board.games.filter((game) => canStartBoard(game)).length;

  return (
    <Box>
      <WeekBar
        compact
        label={board.label}
        previous={board.previous}
        next={board.next}
        onWeek={onWeek}
        disabled={refreshing}
        detail={[weekDates(board.games), `${open} open`].filter(Boolean).join(' · ')}
      />

      {board.games.length === 0 ? (
        <Typography sx={noteSx}>
          No games scheduled this week yet. New games appear as the NFL schedule is published.
        </Typography>
      ) : (
        <>
          {/* every game in the week has kicked off, which is also how the offseason looks */}
          {open === 0 && (
            <Typography sx={{ ...noteSx, py: 0, pb: 2 }}>
              {board.next
                ? 'Every game this week has kicked off. Pick one from a later week.'
                : 'No games are open right now. New games appear as the NFL schedule is published.'}
            </Typography>
          )}
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
        </>
      )}
    </Box>
  );
}
