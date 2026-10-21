import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Box, Typography } from '@mui/material';
import { fonts } from '../../../app/theme';

export default function LeaderboardEmptyState() {
  return (
    <Box
      sx={{
        py: 7,
        px: 3,
        textAlign: 'center',
        borderRadius: '18px',
        border: 1,
        borderStyle: 'dashed',
        borderColor: 'divider',
      }}
    >
      <EmojiEventsIcon sx={{ fontSize: 48, color: 'secondary.main', opacity: 0.5, mb: 1.5 }} />
      <Typography
        sx={{
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: '1.6rem',
          textTransform: 'uppercase',
        }}
      >
        No winners yet
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
        Once contests start paying out quarters, the top players will show up here.
      </Typography>
    </Box>
  );
}
