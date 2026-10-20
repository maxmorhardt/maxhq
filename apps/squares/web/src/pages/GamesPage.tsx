import { Container } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import PageTitle from '../components/PageTitle';
import GamesScoreboard from '../features/games/components/GamesScoreboard';

export default function GamesPage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Helmet>
        <title>NFL Scores – Squares</title>
        <meta
          name="description"
          content="Live NFL scores by quarter for this week's games, the same scores that call every Squares winner."
        />
        <link rel="canonical" href="https://squares.maxhq.io/games" />
      </Helmet>

      <PageTitle
        align="left"
        title="Games"
        subtitle="This week's NFL games, live. These are the scores that call every square."
      />

      <GamesScoreboard />
    </Container>
  );
}
