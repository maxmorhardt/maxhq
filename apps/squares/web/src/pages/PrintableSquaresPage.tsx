import { Box, Container } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import PageTitle from '../components/PageTitle';
import StartBoardCallout from '../features/contests/components/StartBoardCallout';
import PrintableBoardBuilder from '../features/printable/components/PrintableBoardBuilder';

export default function PrintableSquaresPage() {
  return (
    <Container className="squares-print-page" maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Helmet>
        <title>Printable Football Squares Grid – Squares</title>
        <meta
          name="description"
          content="Print a blank 10x10 football squares grid with your team names. Or run the same board online and let the live score fill it in."
        />
        <link rel="canonical" href="https://squares.maxhq.io/printable-football-squares" />
      </Helmet>

      <Box className="squares-no-print">
        <PageTitle
          align="left"
          title="Printable Football Squares"
          subtitle="Add your teams and print a 10x10 grid for the fridge or the office wall."
        />
      </Box>

      <PrintableBoardBuilder />

      <Box className="squares-no-print">
        <StartBoardCallout
          message="Rather skip the pens and the score checking? Run the same board online and the live score picks each quarter for you."
          signedInMessage="Run this board online instead, and the live score picks each quarter for you."
          sx={{ mt: { xs: 4, md: 5 } }}
        />
      </Box>
    </Container>
  );
}
