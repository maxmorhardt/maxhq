import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Paper, Typography } from '@mui/material';

export default function LeaderboardEmptyState() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 5,
        textAlign: 'center',
        borderRadius: 4,
        background: 'rgba(255,255,255,0.03)',
        border: '1px dashed rgba(255,255,255,0.12)',
      }}
    >
      <EmojiEventsIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 1.5, opacity: 0.6 }} />
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        No winners yet
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Once contests start paying out quarters, the top players will show up here.
      </Typography>
    </Paper>
  );
}
