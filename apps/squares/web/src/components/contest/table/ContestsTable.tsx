import { Delete, Edit, EmojiEvents, Logout, Visibility } from '@mui/icons-material';
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router';
import { MAX_CONTEST_SQUARES, type ContestSummary } from '../../../types/contest';
import { getStatusLabel, getStatusOption, isTerminalStatus } from '../../../utils/contestStatus';
import LeaveContest from '../LeaveContest';
import DeleteContest from './DeleteContest';
import EditContest from './EditContest';

interface ContestsTableProps {
  contests: ContestSummary[];
  onLeave?: () => void;
  footer?: ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
}

const roleLabel: Record<ContestSummary['role'], string> = {
  owner: 'Owner',
  participant: 'Joined',
  viewer: 'Viewer',
};

const roleColor: Record<ContestSummary['role'], string> = {
  owner: 'rgba(102,126,234,0.25)',
  participant: 'rgba(76,175,80,0.2)',
  viewer: 'rgba(255,255,255,0.08)',
};

function RoleChip({ role }: { role: ContestSummary['role'] }) {
  return (
    <Chip
      label={roleLabel[role]}
      size="small"
      sx={{
        bgcolor: roleColor[role],
        color: 'rgba(255,255,255,0.85)',
        height: 22,
        '& .MuiChip-label': { fontSize: '0.68rem', px: 1 },
      }}
    />
  );
}

function StatusChip({ status }: { status: ContestSummary['status'] }) {
  return (
    <Chip
      label={getStatusLabel(status)}
      size="small"
      sx={{
        bgcolor: getStatusOption(status).color,
        color: 'white',
        fontWeight: 500,
        height: 24,
        '& .MuiChip-label': { fontSize: '0.72rem', px: 1.25 },
      }}
    />
  );
}

function matchup(contest: ContestSummary) {
  return [contest.homeTeam, contest.awayTeam].filter(Boolean).join(' vs ');
}

function squaresLabel(contest: ContestSummary) {
  const claimed = `${contest.claimedSquares}/${MAX_CONTEST_SQUARES}`;
  return contest.mySquares > 0 ? `${claimed} · ${contest.mySquares} yours` : claimed;
}

export default function ContestsTable({
  contests,
  onLeave,
  footer,
  emptyTitle = 'No contests yet',
  emptySubtitle = 'Create a contest or join one with an invite link',
}: ContestsTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const auth = useAuth();

  const [editTarget, setEditTarget] = useState<ContestSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContestSummary | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<ContestSummary | null>(null);

  const userEmail = auth.user?.profile?.email;

  const canModify = (contest: ContestSummary) =>
    contest.role === 'owner' && !isTerminalStatus(contest.status);
  const canLeave = (contest: ContestSummary) =>
    !!onLeave && !!userEmail && contest.role !== 'owner' && !isTerminalStatus(contest.status);

  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const actionSx = (danger = false) => ({
    color: 'rgba(255,255,255,0.6)',
    '&:hover': {
      color: danger ? '#ff4444' : 'white',
      backgroundColor: danger ? 'rgba(255,68,68,0.1)' : 'rgba(255,255,255,0.1)',
    },
  });

  const actions = (contest: ContestSummary) => (
    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexShrink: 0 }}>
      {canModify(contest) ? (
        <>
          <Tooltip title="Edit Contest">
            <IconButton
              aria-label="Edit contest"
              size="small"
              onClick={stop(() => setEditTarget(contest))}
              sx={actionSx()}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
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
        </>
      ) : (
        <Tooltip title="View Contest">
          <IconButton
            aria-label="View contest"
            size="small"
            onClick={stop(() => setEditTarget(contest))}
            sx={actionSx()}
          >
            <Visibility fontSize="small" />
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

  const headerSx = { color: 'white', fontWeight: 600, fontSize: { xs: '0.75rem', md: '0.875rem' } };
  const mutedSx = {
    color: 'rgba(255,255,255,0.55)',
    fontSize: '0.8rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <>
      <Paper
        sx={{
          background: theme.palette.grey[900],
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
        }}
      >
        {contests.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              py: 8,
              px: 3,
            }}
          >
            <EmojiEvents sx={{ fontSize: 60, color: 'rgba(255,255,255,0.15)' }} />
            <Box>
              <Typography
                variant="h6"
                sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '1rem' }}
              >
                {emptyTitle}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                {emptySubtitle}
              </Typography>
            </Box>
          </Box>
        ) : isMobile ? (
          <Box sx={{ p: 1.5 }}>
            {contests.map((contest, index) => (
              <Box
                key={contest.id}
                onClick={() => navigate(`/contests/${contest.id}`)}
                sx={{
                  cursor: 'pointer',
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                  '&:not(:last-child)': { borderBottom: '1px solid rgba(255,255,255,0.06)' },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.9)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      mr: 1,
                    }}
                  >
                    {contest.name}
                  </Typography>
                  {actions(contest)}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <StatusChip status={contest.status} />
                  <RoleChip role={contest.role} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                    {squaresLabel(contest)}
                  </Typography>
                </Box>
                {matchup(contest) && (
                  <Typography
                    sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', mt: 0.75 }}
                  >
                    {matchup(contest)}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <TableCell sx={{ ...headerSx, width: '28%' }}>Name</TableCell>
                  <TableCell sx={{ ...headerSx, width: '11%' }}>Role</TableCell>
                  <TableCell sx={{ ...headerSx, width: '24%' }}>Matchup</TableCell>
                  <TableCell sx={{ ...headerSx, width: '14%' }}>Squares</TableCell>
                  <TableCell sx={{ ...headerSx, width: '11%' }}>Status</TableCell>
                  <TableCell sx={{ ...headerSx, width: '12%', textAlign: 'right' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contests.map((contest, index) => (
                  <TableRow
                    key={contest.id}
                    onClick={() => navigate(`/contests/${contest.id}`)}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: index % 2 === 0 ? '' : 'rgba(255,255,255,0.02)',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.07)' },
                      '&:last-child td': { borderBottom: 0 },
                    }}
                  >
                    <TableCell
                      sx={{
                        color: 'rgba(255,255,255,0.9)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {contest.name}
                    </TableCell>
                    <TableCell>
                      <RoleChip role={contest.role} />
                    </TableCell>
                    <TableCell sx={mutedSx}>
                      {matchup(contest) || (
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>–</span>
                      )}
                    </TableCell>
                    <TableCell sx={mutedSx}>{squaresLabel(contest)}</TableCell>
                    <TableCell>
                      <StatusChip status={contest.status} />
                    </TableCell>
                    <TableCell>{actions(contest)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {footer}
      </Paper>

      <DeleteContest
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        contest={deleteTarget}
      />
      <EditContest open={!!editTarget} onClose={() => setEditTarget(null)} contest={editTarget} />
      <LeaveContest
        open={!!leaveTarget}
        onClose={() => setLeaveTarget(null)}
        contest={leaveTarget}
        userEmail={userEmail ?? ''}
        onLeft={onLeave}
      />
    </>
  );
}
