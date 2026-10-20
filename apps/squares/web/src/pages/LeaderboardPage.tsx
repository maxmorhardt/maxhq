import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Box, Container, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { popIn } from '../components/animations';
import Standings from '../features/leaderboard/components/Standings';

// matches the number of players the API returns by default
const TOP_COUNT = 10;

export default function LeaderboardPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3 } }}>
      <Helmet>
        <title>Leaderboard – Squares</title>
        <meta
          name="description"
          content="See the top Squares players ranked by all-time quarter wins."
        />
      </Helmet>

      <Box
        sx={{ textAlign: 'center', mb: { xs: 4, md: 5 }, animation: `${popIn} 0.5s ease-out both` }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 1.75,
            py: 0.5,
            mb: 1.75,
            borderRadius: 5,
            background: 'rgba(255,215,0,0.08)',
            border: '1px solid rgba(255,215,0,0.28)',
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: 17, color: '#ffd700' }} />
          <Typography
            variant="caption"
            sx={{
              color: '#ffd700',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
            }}
          >
            All-Time Top {TOP_COUNT}
          </Typography>
        </Box>

        <Typography
          component="h1"
          sx={{
            fontWeight: 900,
            fontSize: { xs: '2.25rem', md: '3rem' },
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #ffffff 0%, #b9c6ff 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Leaderboard
        </Typography>

        <Typography
          sx={{ color: 'text.secondary', mt: 1, mx: 'auto', maxWidth: 460, lineHeight: 1.6 }}
        >
          The best players across every contest, ranked by quarter wins.
        </Typography>
      </Box>

      <Standings />
    </Container>
  );
}
