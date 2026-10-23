import { Close, Delete, OpenInNew } from '@mui/icons-material';
import { Box, Button, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { fonts } from '../../../../app/theme';
import TeamMark from '../../../../components/TeamMark';
import { MAX_CONTEST_SQUARES, type ContestSummary } from '../../../../types/contest';
import { getStatusLabel, isTerminalStatus } from '../../../../utils/contestStatus';
import { formatKickoff } from '../../../../utils/game';

interface Props {
  contest: ContestSummary | null;
  onClose: () => void;
  onDelete: (contest: ContestSummary) => void;
}

const roleLabel: Record<ContestSummary['role'], string> = {
  owner: 'Owner',
  participant: 'Player',
  viewer: 'Watching',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

// a contest's settings are fixed at creation, so this only shows them; owners can still delete
export default function ContestInfoDialog({ contest, onClose, onDelete }: Props) {
  const navigate = useNavigate();

  if (!contest) {
    return null;
  }

  const canDelete = contest.role === 'owner' && !isTerminalStatus(contest.status);
  const matchup =
    contest.awayTeam && contest.homeTeam ? `${contest.awayTeam} @ ${contest.homeTeam}` : '–';

  const rows: [string, string][] = [
    ['Game', matchup],
    ['Kickoff', contest.gameTime ? formatKickoff(contest.gameTime) : '–'],
    ['Status', getStatusLabel(contest.status)],
    ['Visibility', contest.visibility === 'public' ? 'Public' : 'Private'],
    ['Squares claimed', `${contest.claimedSquares} of ${MAX_CONTEST_SQUARES}`],
    ['Your squares', String(contest.mySquares)],
    ['Your role', roleLabel[contest.role]],
    ['Owner', contest.owner],
    ['Created', contest.createdAt ? formatDate(contest.createdAt) : '–'],
  ];

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      disableRestoreFocus
      aria-labelledby="contest-info-title"
    >
      <IconButton
        onClick={onClose}
        size="small"
        aria-label="Close dialog"
        sx={{ position: 'absolute', right: 10, top: 10, zIndex: 1, color: 'text.secondary' }}
      >
        <Close fontSize="small" />
      </IconButton>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <TeamMark abbr={contest.awayAbbr} name={contest.awayTeam} size={36} />
          <Box sx={{ ml: -0.75 }}>
            <TeamMark abbr={contest.homeAbbr} name={contest.homeTeam} size={36} />
          </Box>
        </Box>
        <Typography
          id="contest-info-title"
          component="h2"
          sx={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: '1.7rem',
            lineHeight: 1,
            textTransform: 'uppercase',
            overflowWrap: 'anywhere',
            pr: 4,
          }}
        >
          {contest.name}
        </Typography>

        <Box
          component="dl"
          sx={{
            m: 0,
            mt: 2.5,
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr)',
            columnGap: 2,
            rowGap: 1.25,
            '& dt': { color: 'text.secondary', fontSize: '0.9rem' },
            '& dd': {
              m: 0,
              fontWeight: 600,
              fontSize: '0.9rem',
              textAlign: 'right',
              overflowWrap: 'anywhere',
            },
          }}
        >
          {rows.map(([label, value]) => (
            <Box key={label} sx={{ display: 'contents' }}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<OpenInNew />}
            onClick={() => navigate(`/contests/${contest.id}`)}
            sx={{ flex: 1 }}
          >
            Open Contest
          </Button>
          {canDelete && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => onDelete(contest)}
            >
              Delete
            </Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
