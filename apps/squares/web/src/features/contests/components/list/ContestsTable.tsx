import { Delete, EmojiEvents, InfoOutlined, Logout } from '@mui/icons-material';
import { Box, Chip, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import { fonts, game as palette } from '../../../../app/theme';
import TeamMark from '../../../../components/TeamMark';
import { MAX_CONTEST_SQUARES, type ContestSummary } from '../../../../types/contest';
import { getStatusLabel, isInGameStatus, isTerminalStatus } from '../../../../utils/contestStatus';
import { formatKickoff } from '../../../../utils/game';
import LeaveContestDialog from '../LeaveContestDialog';
import ContestInfoDialog from './ContestInfoDialog';
import DeleteContestDialog from './DeleteContestDialog';

interface Props {
  contests: ContestSummary[];
  footer?: ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
}

const roleLabel: Record<ContestSummary['role'], string> = {
  owner: 'Owner',
  participant: 'Joined',
  viewer: 'Viewer',
};

function StatusPill({ status }: { status: ContestSummary['status'] }) {
  const live = isInGameStatus(status);
  const final = status === 'FINISHED';
  const color = live ? palette.flag : final ? palette.gold : palette.brand;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.4,
        borderRadius: '8px',
        border: 1,
        borderColor: alpha(color, 0.5),
        bgcolor: alpha(color, 0.12),
        color,
        fontFamily: fonts.display,
        fontWeight: 700,
        fontSize: '0.82rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {live && (
        <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color }} />
      )}
      {getStatusLabel(status)}
    </Box>
  );
}

function matchup(contest: ContestSummary) {
  if (contest.awayTeam && contest.homeTeam) {
    return `${contest.awayTeam} @ ${contest.homeTeam}`;
  }
  return contest.homeTeam || contest.awayTeam || '';
}

function squaresLabel(contest: ContestSummary) {
  const claimed = `${contest.claimedSquares}/${MAX_CONTEST_SQUARES}`;
  return contest.mySquares > 0 ? `${claimed} · ${contest.mySquares} yours` : claimed;
}

export default function ContestsTable({
  contests,
  footer,
  emptyTitle = 'No contests yet',
  emptySubtitle = 'Create a contest or join one with an invite link',
}: Props) {
  const navigate = useNavigate();
  const auth = useAuth();

  const [infoTarget, setInfoTarget] = useState<ContestSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContestSummary | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<ContestSummary | null>(null);

  const userEmail = auth.user?.profile?.email;

  const canDelete = (contest: ContestSummary) =>
    contest.role === 'owner' && !isTerminalStatus(contest.status);
  const canLeave = (contest: ContestSummary) =>
    !!userEmail && contest.role !== 'owner' && !isTerminalStatus(contest.status);

  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const open = (contest: ContestSummary) => navigate(`/contests/${contest.id}`);
  const openOnKey = (contest: ContestSummary) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.target === e.currentTarget) {
      open(contest);
    }
  };

  const actionSx = (danger = false) => ({
    color: 'text.secondary',
    '&:hover': {
      color: danger ? 'error.main' : 'text.primary',
      backgroundColor: danger ? alpha(palette.flag, 0.1) : alpha(palette.chalk, 0.08),
    },
  });

  const actions = (contest: ContestSummary) => (
    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexShrink: 0 }}>
      <Tooltip title="Contest Details">
        <IconButton
          aria-label="Contest details"
          size="small"
          onClick={stop(() => setInfoTarget(contest))}
          sx={actionSx()}
        >
          <InfoOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
      {canDelete(contest) && (
        <Tooltip title="Delete Contest">
          <IconButton
            aria-label="Delete contest"
            size="small"
            onClick={stop(() => setDeleteTarget(contest))}
            sx={actionSx(true)}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {canLeave(contest) && (
        <Tooltip title="Leave Contest">
          <IconButton
            aria-label="Leave contest"
            size="small"
            onClick={stop(() => setLeaveTarget(contest))}
            sx={actionSx(true)}
          >
            <Logout fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  return (
    <>
      {contests.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            py: 8,
            px: 3,
            borderRadius: '18px',
            border: 1,
            borderColor: 'divider',
            borderStyle: 'dashed',
          }}
        >
          <EmojiEvents sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.4 }} />
          <Box>
            <Typography sx={{ fontWeight: 600 }}>{emptyTitle}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {emptySubtitle}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.25 }}>
          {contests.map((contest) => {
            const fill = (contest.claimedSquares / MAX_CONTEST_SQUARES) * 100;
            const upcoming = contest.status === 'ACTIVE' && contest.gameTime;

            return (
              <Box
                key={contest.id}
                component="li"
                tabIndex={0}
                aria-label={contest.name}
                onClick={() => open(contest)}
                onKeyDown={openOnKey(contest)}
                sx={{
                  cursor: 'pointer',
                  display: 'grid',
                  alignItems: 'center',
                  gridTemplateColumns: {
                    xs: 'auto minmax(0, 1fr) auto',
                    md: '76px minmax(0, 1fr) 220px 128px 76px 76px',
                  },
                  gridTemplateAreas: {
                    xs: '"teams name actions" "fill fill fill" "status role role"',
                    md: '"teams name fill status role actions"',
                  },
                  columnGap: { xs: 1.5, md: 2.5 },
                  rowGap: 1.5,
                  p: { xs: 1.75, md: 2 },
                  borderRadius: '16px',
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  transition: 'border-color 160ms, transform 160ms',
                  '&:hover': { borderColor: palette.lineStrong, transform: 'translateY(-1px)' },
                  '&:focus-visible': { outline: `2px solid ${palette.brand}`, outlineOffset: 2 },
                  '@media (prefers-reduced-motion: reduce)': { '&:hover': { transform: 'none' } },
                }}
              >
                <Box sx={{ gridArea: 'teams', display: 'flex', alignItems: 'center' }}>
                  <TeamMark abbr={contest.awayAbbr} name={contest.awayTeam} size={36} />
                  <Box
                    sx={{
                      ml: -0.75,
                      borderRadius: '11px',
                      boxShadow: `0 0 0 3px ${palette.field}`,
                    }}
                  >
                    <TeamMark abbr={contest.homeAbbr} name={contest.homeTeam} size={36} />
                  </Box>
                </Box>

                <Box sx={{ gridArea: 'name', minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 700, fontSize: '1rem' }}>
                    {contest.name}
                  </Typography>
                  <Typography noWrap sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                    {matchup(contest) || '–'}
                    {upcoming ? ` · ${formatKickoff(contest.gameTime!)}` : ''}
                  </Typography>
                </Box>

                <Box sx={{ gridArea: 'fill', minWidth: 0 }}>
                  <LinearProgress
                    variant="determinate"
                    value={fill}
                    aria-label="squares claimed"
                    sx={{ height: 6, borderRadius: 3, bgcolor: alpha(palette.chalk, 0.08) }}
                  />
                  <Typography
                    sx={{
                      mt: 0.75,
                      color: 'text.secondary',
                      fontSize: '0.78rem',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {squaresLabel(contest)}
                  </Typography>
                </Box>

                <Box sx={{ gridArea: 'status', justifySelf: { md: 'end' } }}>
                  <StatusPill status={contest.status} />
                </Box>

                <Box sx={{ gridArea: 'role', justifySelf: { md: 'center' } }}>
                  <Chip label={roleLabel[contest.role]} size="small" variant="outlined" />
                </Box>

                <Box sx={{ gridArea: 'actions' }}>{actions(contest)}</Box>
              </Box>
            );
          })}
        </Box>
      )}
      {footer}

      <DeleteContestDialog contest={deleteTarget} onClose={() => setDeleteTarget(null)} />
      <ContestInfoDialog
        contest={infoTarget}
        onClose={() => setInfoTarget(null)}
        onDelete={(contest) => {
          setInfoTarget(null);
          setDeleteTarget(contest);
        }}
      />
      <LeaveContestDialog contest={leaveTarget} onClose={() => setLeaveTarget(null)} />
    </>
  );
}
