import { Groups, PersonAdd, School } from '@mui/icons-material';
import { Badge, Box, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link } from 'react-router';
import { game } from '../../../../app/theme';
import type { Player } from '../../../../types/contest';
import type { ContestViewer } from '../../live/viewer';
import type { ContestDialog } from './ContestDialogs';

interface Props {
  players: Player[];
  viewer: ContestViewer;
  onOpen: (dialog: ContestDialog) => void;
  squaresToGive: boolean;
}

const actionSx = {
  minWidth: 0,
  px: { xs: 1, sm: 1.5 },
  color: 'text.secondary',
  borderColor: 'divider',
  '&:hover': { color: 'text.primary' },
};

const countSx = {
  ml: 0.75,
  minWidth: 20,
  height: 20,
  px: 0.75,
  borderRadius: '10px',
  display: 'inline-grid',
  placeItems: 'center',
  bgcolor: alpha(game.chalk, 0.1),
  color: 'text.primary',
  fontSize: '0.72rem',
  fontWeight: 700,
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
};

export default function ContestActionIcons({ players, viewer, onOpen, squaresToGive }: Props) {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {viewer.isOwner && (
        <Button
          variant="contained"
          size="small"
          onClick={() => onOpen('invite')}
          startIcon={<PersonAdd />}
          sx={{ px: 1.5 }}
        >
          Invite
        </Button>
      )}
      <Badge variant="dot" color="warning" invisible={!squaresToGive} overlap="rectangular">
        <Button
          variant="outlined"
          size="small"
          aria-label={
            squaresToGive
              ? `Players (${players.length}), squares left to give out`
              : `Players (${players.length})`
          }
          onClick={() => onOpen('players')}
          startIcon={<Groups />}
          sx={actionSx}
        >
          Players
          <Box component="span" aria-hidden sx={countSx}>
            {players.length}
          </Box>
        </Button>
      </Badge>
      <Button
        variant="outlined"
        size="small"
        aria-label="How to play"
        component={Link}
        to="/learn-more"
        startIcon={<School />}
        sx={{ ...actionSx, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.75 }, ml: 0 } }}
      >
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
          Rules
        </Box>
      </Button>
    </Box>
  );
}
