import GitHubIcon from '@mui/icons-material/GitHub';
import GoogleIcon from '@mui/icons-material/Google';
import { Box, Button, Container, LinearProgress, Link, Skeleton, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useAuth } from 'react-oidc-context';
import { errorMessage } from '../../../api/errors';
import { fonts, game as palette } from '../../../app/theme';
import InAppBrowserNotice from '../../../auth/InAppBrowserNotice';
import { signInWithProvider, type OIDCProvider } from '../../../auth/oidc';
import TeamMark from '../../../components/TeamMark';
import type { InvitePreviewResponse } from '../../../types/contest';
import { formatKickoff } from '../../../utils/game';
import { usePreviewInviteQuery } from '../../contests/api';
import JoinError from './JoinError';

interface Props {
  token: string;
}

const BOARD_SIZE = 100;

// the claimed squares scattered over a small board, in the same order the landing demo fills its own
function MiniBoard({ claimed, total }: { claimed: number; total: number }) {
  const filled = Math.round((claimed / Math.max(total, 1)) * BOARD_SIZE);
  return (
    <Box
      aria-hidden
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gap: '3px',
        width: '100%',
        maxWidth: 220,
        aspectRatio: '1',
        p: 1,
        borderRadius: '12px',
        bgcolor: palette.night,
        border: 1,
        borderColor: 'divider',
      }}
    >
      {Array.from({ length: BOARD_SIZE }, (_, i) => {
        const taken = (i * 37) % BOARD_SIZE < filled;
        return (
          <Box
            key={i}
            sx={{
              borderRadius: '3px',
              bgcolor: taken ? alpha(palette.brand, 0.55) : 'transparent',
              border: 1,
              borderColor: taken ? alpha(palette.brand, 0.8) : palette.line,
            }}
          />
        );
      })}
    </Box>
  );
}

function whatToExpect(preview: InvitePreviewResponse): string {
  const open = preview.totalSquares - preview.claimedSquares;
  if (preview.status !== 'ACTIVE') {
    return 'The game is underway, so you can join to follow the board live.';
  }
  if (open <= 0) {
    return 'The board is full and locked, so you can join to watch the game.';
  }
  return `You can claim up to ${preview.maxSquares} of the ${open} open squares.`;
}

function ContestHeading({ preview }: { preview: InvitePreviewResponse }) {
  const matchup =
    preview.awayTeam && preview.homeTeam ? `${preview.awayTeam} at ${preview.homeTeam}` : null;

  return (
    <Box sx={{ gridArea: 'heading' }}>
      <Typography
        sx={{
          color: 'primary.light',
          fontSize: '0.78rem',
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        You&apos;re invited
      </Typography>
      <Typography
        component="h1"
        sx={{
          mt: 1,
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: { xs: '2.6rem', md: '3.6rem' },
          lineHeight: 0.95,
          textTransform: 'uppercase',
          overflowWrap: 'anywhere',
        }}
      >
        {preview.contestName}
      </Typography>

      {matchup && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TeamMark abbr={preview.awayAbbr} name={preview.awayTeam} size={40} />
            <Box sx={{ ml: -0.75, borderRadius: '12px', boxShadow: `0 0 0 3px ${palette.night}` }}>
              <TeamMark abbr={preview.homeAbbr} name={preview.homeTeam} size={40} />
            </Box>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>{matchup}</Typography>
            {preview.gameTime && (
              <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                Kickoff {formatKickoff(preview.gameTime)}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function ContestFill({ preview }: { preview: InvitePreviewResponse }) {
  const fill = (preview.claimedSquares / Math.max(preview.totalSquares, 1)) * 100;

  return (
    <Box
      sx={{
        gridArea: 'fill',
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 2, sm: 3 },
        flexDirection: { xs: 'column', sm: 'row' },
      }}
    >
      <MiniBoard claimed={preview.claimedSquares} total={preview.totalSquares} />
      <Box sx={{ flex: 1, width: '100%' }}>
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: '2.2rem',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {preview.claimedSquares}
          <Box component="span" sx={{ color: 'text.secondary', fontSize: '1.2rem' }}>
            /{preview.totalSquares} claimed
          </Box>
        </Typography>
        <LinearProgress
          variant="determinate"
          value={fill}
          aria-label="squares claimed"
          sx={{ mt: 1.25, height: 8, borderRadius: 4, bgcolor: alpha(palette.chalk, 0.08) }}
        />
        <Typography sx={{ mt: 1.5, color: 'text.secondary', lineHeight: 1.6 }}>
          {whatToExpect(preview)}
        </Typography>
      </Box>
    </Box>
  );
}

// an invite opened while signed out: the contest it leads to, and sign-in that comes straight back here
export default function InviteSignIn({ token }: Props) {
  const auth = useAuth();
  const { data: preview, error, isLoading } = usePreviewInviteQuery(token);

  if (error) {
    return (
      <JoinError
        variant="error"
        message={errorMessage(error, 'This invite link is invalid or expired')}
      />
    );
  }

  const signIn = (provider: OIDCProvider) => signInWithProvider(auth, provider);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.25fr) minmax(0, 0.75fr)' },
          // on phones sign-in comes right after what the contest is, before the board details
          gridTemplateAreas: {
            xs: '"heading" "signin" "fill"',
            md: '"heading signin" "fill signin"',
          },
          columnGap: 7,
          rowGap: { xs: 4, md: 3.5 },
          alignItems: 'start',
        }}
      >
        {isLoading || !preview ? (
          <Box data-testid="invite-preview-loading" sx={{ gridArea: 'heading' }}>
            <Skeleton variant="text" width={120} />
            <Skeleton variant="text" width="80%" sx={{ fontSize: '3.4rem' }} />
            <Skeleton variant="rounded" width="60%" height={44} sx={{ mt: 2.5 }} />
          </Box>
        ) : (
          <>
            <ContestHeading preview={preview} />
            <ContestFill preview={preview} />
          </>
        )}

        <Box
          sx={{
            gridArea: 'signin',
            alignSelf: { md: 'center' },
            p: { xs: 2.5, sm: 3.5 },
            borderRadius: '22px',
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 40px 90px -40px rgba(0, 0, 0, 0.9)',
            display: 'grid',
            gap: 1.5,
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: '1.7rem',
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            Take your seat
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 1 }}>
            Sign in and you join the contest straight away.
          </Typography>

          <InAppBrowserNotice />

          <Button
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={() => signIn('google')}
          >
            Continue with Google
          </Button>
          <Button
            variant="outlined"
            size="large"
            color="inherit"
            startIcon={<GitHubIcon />}
            onClick={() => signIn('github')}
          >
            Continue with GitHub
          </Button>

          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1 }}>
            By signing in, you agree to our{' '}
            <Link href="https://maxhq.io/terms-of-service" target="_blank" rel="noreferrer">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="https://maxhq.io/privacy-policy" target="_blank" rel="noreferrer">
              Privacy Policy
            </Link>
            .
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}
