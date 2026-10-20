import { EmojiEvents } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { fonts, game as palette } from '../../../../app/theme';
import type { Contest, Game, QuarterResult } from '../../../../types/contest';
import { winnerLabel } from '../../live/activity';
import type { ContestViewer } from '../../live/viewer';

interface Props {
  contest: Contest;
  game?: Game;
  viewer: ContestViewer;
}

type QuarterState = 'won' | 'scored' | 'live' | 'upcoming';

interface Quarter {
  quarter: number;
  state: QuarterState;
  result?: QuarterResult;
  score?: { away: number; home: number };
}

const QUARTERS = [1, 2, 3, 4];

function quarters(contest: Contest, game: Game | undefined): Quarter[] {
  const results = contest.quarterResults ?? [];
  const scores = game?.scores ?? [];
  const playing = game?.status === 'in_progress' ? Math.min(game.period, 4) : 0;

  return QUARTERS.map((quarter) => {
    const result = results.find((r) => r.quarter === quarter);
    if (result) {
      return {
        quarter,
        state: 'won',
        result,
        score: { away: result.awayTeamScore, home: result.homeTeamScore },
      };
    }

    // a quarter can end without a winner, when its square was never claimed
    const score = scores.find((s) => s.quarter === quarter);
    if (score) {
      return { quarter, state: 'scored', score: { away: score.awayScore, home: score.homeScore } };
    }

    return { quarter, state: quarter === playing ? 'live' : 'upcoming' };
  });
}

// each quarter's score at the whistle and the square that took it
export default function QuarterStrip({ contest, game, viewer }: Props) {
  return (
    <Box
      component="ol"
      aria-label="Quarter winners"
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
        gap: 1.25,
      }}
    >
      {quarters(contest, game).map(({ quarter, state, result, score }) => {
        const mine = !!result && !!viewer.email && result.winner === viewer.email;
        const won = state === 'won';

        return (
          <Box
            key={quarter}
            component="li"
            aria-current={state === 'live' ? 'step' : undefined}
            sx={{
              position: 'relative',
              display: 'grid',
              gap: 0.5,
              p: 1.75,
              minHeight: 104,
              borderRadius: '16px',
              border: 1,
              borderColor: won
                ? alpha(palette.gold, mine ? 0.9 : 0.45)
                : state === 'live'
                  ? 'primary.main'
                  : 'divider',
              bgcolor: won ? alpha(palette.gold, mine ? 0.16 : 0.06) : 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography
                sx={{
                  fontFamily: fonts.display,
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: won
                    ? 'secondary.main'
                    : state === 'live'
                      ? 'primary.main'
                      : 'text.secondary',
                }}
              >
                Q{quarter}
              </Typography>
              {won && <EmojiEvents sx={{ fontSize: '1.1rem', color: 'secondary.main' }} />}
              {state === 'live' && (
                <Typography
                  sx={{
                    fontFamily: fonts.display,
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    letterSpacing: '0.14em',
                    color: 'primary.main',
                  }}
                >
                  PLAYING
                </Typography>
              )}
            </Box>

            <Typography
              sx={{
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: '1.5rem',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                color: score ? 'text.primary' : 'text.secondary',
              }}
            >
              {score ? `${score.away}–${score.home}` : '–'}
            </Typography>

            <Typography
              noWrap
              sx={{
                fontSize: '0.82rem',
                color: mine ? 'secondary.main' : 'text.secondary',
                fontWeight: mine ? 700 : 500,
              }}
            >
              {result
                ? mine
                  ? 'You won'
                  : winnerLabel(result.winner, result.winnerName) || 'Winner'
                : state === 'scored'
                  ? 'No winner'
                  : state === 'live'
                    ? 'In progress'
                    : 'Not yet played'}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
