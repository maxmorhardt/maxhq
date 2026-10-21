import { Container, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import PageTitle from '../components/PageTitle';
import Standings from '../features/leaderboard/components/Standings';

// matches the number of players the API returns by default
const TOP_COUNT = 10;

export default function LeaderboardPage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3 } }}>
      <Helmet>
        <title>Leaderboard – Squares</title>
        <meta
          name="description"
          content="See the top Squares players ranked by all-time quarter wins."
        />
      </Helmet>

      <Standings
        header={
          <PageTitle
            align="left"
            title="Leaderboard"
            subtitle={`All-time top ${TOP_COUNT}: the best players across every contest, ranked by quarter wins.`}
          />
        }
      />

      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2.5, textAlign: 'center' }}>
        Win rate is quarter wins over the quarters a player held a square in.
      </Typography>
    </Container>
  );
}
