import { SportsFootball } from '@mui/icons-material';
import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useAuth } from 'react-oidc-context';
import { game } from '../../../app/theme';
import CreateContestButton from './CreateContestButton';

interface Props {
  message: string;
  signedInMessage: string;
  sx?: SxProps<Theme>;
}

// a quiet next step on an inner page, worded for newcomers (often from an ad) and for players
export default function StartBoardCallout({ message, signedInMessage, sx }: Props) {
  const auth = useAuth();
  const signedIn = auth.isAuthenticated;

  return (
    <Box
      component="aside"
      aria-label="Start a board"
      sx={[
        {
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          columnGap: 1.5,
          rowGap: 0.5,
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
          borderRadius: '14px',
          bgcolor: alpha(game.brand, 0.06),
          border: `1px solid ${alpha(game.brand, 0.16)}`,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <SportsFootball sx={{ color: game.brand, fontSize: 20 }} />
      <Typography sx={{ flex: 1, minWidth: 220, color: 'text.secondary' }}>
        {signedIn ? signedInMessage : message}
      </Typography>
      <CreateContestButton look="link" label={signedIn ? 'Start a board' : 'Start a free board'} />
    </Box>
  );
}
