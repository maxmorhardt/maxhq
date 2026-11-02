import { Box, Button, Paper, Typography, type SxProps, type Theme } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { Link } from 'react-router';
import { fonts } from '../../../app/theme';
import CreateContestButton from './CreateContestButton';

interface Props {
  showHowToPlay?: boolean;
  sx?: SxProps<Theme>;
}

// the next step for a visitor who landed on an inner page, often from an ad
export default function StartBoardCallout({ showHowToPlay = true, sx }: Props) {
  const auth = useAuth();

  if (auth.isAuthenticated) {
    return null;
  }

  return (
    <Paper
      component="section"
      aria-labelledby="start-board-title"
      variant="outlined"
      sx={[
        {
          p: { xs: 3, md: 4 },
          borderRadius: '18px',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          gap: 3,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box sx={{ maxWidth: '52ch' }}>
        <Typography
          id="start-board-title"
          component="h2"
          sx={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: { xs: '1.8rem', md: '2.1rem' },
            lineHeight: 1.05,
            textTransform: 'uppercase',
          }}
        >
          New to Squares?
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary' }}>
          Start a free football squares board for any NFL game, share one link, and the live score
          does the rest. Free to play, with no money involved.
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, flexShrink: 0 }}>
        <CreateContestButton />
        {showHowToPlay && (
          <Button component={Link} to="/learn-more" variant="outlined" color="inherit" size="large">
            How to Play
          </Button>
        )}
      </Box>
    </Paper>
  );
}
