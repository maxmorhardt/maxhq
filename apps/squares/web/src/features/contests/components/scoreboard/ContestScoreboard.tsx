import { Lock, Public } from '@mui/icons-material';
import { Box, Chip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { StreamStatus } from '../../../../api/eventStream';
import { fonts, game as palette } from '../../../../app/theme';
import TeamMark from '../../../../components/TeamMark';
import type { Contest, Participant } from '../../../../types/contest';
import { getStatusLabel } from '../../../../utils/contestStatus';
import { currentScore, gameClock, isLive } from '../../../../utils/game';
import type { ContestViewer } from '../../live/viewer';
import ConnectionStatus from '../ConnectionStatus';
import ContestActionIcons from '../details/ContestActionIcons';

interface Props {
  contest: Contest;
  participants: Participant[];
  viewer: ContestViewer;
  status: StreamStatus;
  onRetry: () => void;
}

function TeamSide({
  abbr,
  name,
  score,
  side,
}: {
  abbr?: string;
  name: string;
  score: number | null;
  side: 'away' | 'home';
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, sm: 1.75 },
        flexDirection: side === 'home' ? 'row-reverse' : 'row',
        minWidth: 0,
      }}
    >
      <TeamMark abbr={abbr} name={name} size={44} />
      <Box sx={{ minWidth: 0, textAlign: side === 'home' ? 'right' : 'left' }}>
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: '0.78rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          {side}
        </Typography>
        <Typography
          noWrap
          sx={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: { xs: '1rem', sm: '1.25rem' },
            textTransform: 'uppercase',
            lineHeight: 1.1,
          }}
        >
          {name}
        </Typography>
      </Box>
      <Typography
        aria-label={`${side} score`}
        sx={{
          mx: { xs: 0.5, sm: 1.5 },
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: { xs: '2.4rem', sm: '3.2rem' },
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          color: score === null ? 'text.secondary' : 'text.primary',
        }}
      >
        {score ?? '–'}
      </Typography>
    </Box>
  );
}

// the contest's broadcast header: who is playing, the live score, and where the game is
export default function ContestScoreboard({
  contest,
  participants,
  viewer,
  status,
  onRetry,
}: Props) {
  const game = contest.game;
  const score = currentScore(contest);
  const live = isLive(game);
  const clock = game ? gameClock(game) : getStatusLabel(contest.status);
  const role = viewer.isOwner ? 'Owner' : viewer.isParticipant ? 'Player' : 'Watching';

  return (
    <Box
      component="header"
      sx={{
        borderRadius: '20px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          px: { xs: 2, sm: 3 },
          py: 1.75,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h1"
            noWrap
            sx={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: { xs: '1.6rem', sm: '2.1rem' },
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            {contest.name}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            <Chip
              size="small"
              variant="outlined"
              icon={contest.visibility === 'private' ? <Lock /> : <Public />}
              label={contest.visibility === 'private' ? 'Private' : 'Public'}
            />
            <Chip size="small" variant="outlined" label={role} />
          </Box>
        </Box>
        <ContestActionIcons contest={contest} participants={participants} viewer={viewer} />
      </Box>

      {/* the score bug */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          alignItems: 'center',
          gap: { xs: 1, sm: 2 },
          px: { xs: 1.5, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          background: `linear-gradient(90deg, ${alpha(palette.brand, 0.06)}, transparent 30%, transparent 70%, ${alpha(palette.brand, 0.06)})`,
        }}
      >
        <TeamSide
          side="away"
          abbr={game?.awayAbbr}
          name={game?.awayTeam ?? contest.awayTeam ?? 'Away'}
          score={score?.away ?? null}
        />

        <Box sx={{ display: 'grid', justifyItems: 'center', gap: 0.75, textAlign: 'center' }}>
          <Box
            sx={{
              px: 1.25,
              py: 0.5,
              borderRadius: '8px',
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: { xs: '0.85rem', sm: '1rem' },
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              bgcolor: contest.status === 'FINISHED' ? 'secondary.main' : 'background.default',
              color: contest.status === 'FINISHED' ? palette.night : 'text.primary',
              border: 1,
              borderColor: contest.status === 'FINISHED' ? 'secondary.main' : 'divider',
            }}
          >
            {clock}
          </Box>
          {live && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.16em',
                color: 'error.main',
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                  animation: 'live-blink 1.6s ease-in-out infinite',
                  '@keyframes live-blink': { '50%': { opacity: 0.3 } },
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                }}
              />
              LIVE
            </Box>
          )}
        </Box>

        <TeamSide
          side="home"
          abbr={game?.homeAbbr}
          name={game?.homeTeam ?? contest.homeTeam ?? 'Home'}
          score={score?.home ?? null}
        />
      </Box>

      <Box sx={{ px: 2, pb: status === 'live' || status === 'connecting' ? 0 : 1.5 }}>
        <ConnectionStatus status={status} onRetry={onRetry} />
      </Box>
    </Box>
  );
}
