import { ArrowForward, Bolt, GridView, Groups } from '@mui/icons-material';
import { Box, Button, Container, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link } from 'react-router';
import { fonts, game } from '../../../../app/theme';
import SignInPrompt from '../../../../auth/SignInPrompt';

const perks = [
  {
    icon: <GridView />,
    title: 'Create a board for any NFL game',
    body: 'Pick an upcoming game, give it a name, and share one link.',
  },
  {
    icon: <Groups />,
    title: 'Join friends with an invite link',
    body: 'Open the link, sign in, and claim your squares from your phone.',
  },
  {
    icon: <Bolt />,
    title: 'Follow every board live',
    body: "Scores, numbers, and each quarter's square update for everyone in real time.",
  },
];

export default function ContestsSignedOut() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 }, px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.1fr) minmax(0, 0.9fr)' },
          gap: { xs: 4, md: 8 },
          alignItems: 'center',
        }}
      >
        {/* what an account gets you */}
        <Box>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: { xs: '2.6rem', sm: '3.6rem' },
              lineHeight: 0.95,
              textTransform: 'uppercase',
            }}
          >
            All your boards in one place
          </Typography>
          <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: '1.05rem' }}>
            Sign in to see the boards you&apos;ve created and the ones friends invited you to.
          </Typography>

          <Box
            component="ul"
            sx={{ listStyle: 'none', m: 0, mt: 3.5, p: 0, display: 'grid', gap: 2.5 }}
          >
            {perks.map((perk) => (
              <Box component="li" key={perk.title} sx={{ display: 'flex', gap: 1.75 }}>
                <Box
                  aria-hidden
                  sx={{
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    color: game.brand,
                    bgcolor: alpha(game.brand, 0.12),
                    '& svg': { fontSize: 20 },
                  }}
                >
                  {perk.icon}
                </Box>
                <Box>
                  <Typography component="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {perk.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {perk.body}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 3.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button component={Link} to="/learn-more" endIcon={<ArrowForward />} size="small">
              How to play
            </Button>
            <Button component={Link} to="/games" endIcon={<ArrowForward />} size="small">
              This week&apos;s games
            </Button>
          </Box>
        </Box>

        <SignInPrompt
          title="Sign in to continue"
          description="It's free, there's no money involved, and you use an account you already have."
        />
      </Box>
    </Container>
  );
}
