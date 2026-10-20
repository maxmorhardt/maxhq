import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GridOnIcon from '@mui/icons-material/GridOn';
import GridViewIcon from '@mui/icons-material/GridView';
import GroupsIcon from '@mui/icons-material/Groups';
import { Alert, Box, Button, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { fonts, game as palette } from '../../../app/theme';
import LeaderboardRankCard from '../../leaderboard/components/LeaderboardRankCard';
import { useGetMyRankQuery } from '../../leaderboard/api';
import { useGetMyProfileQuery, useGetMyStatsQuery } from '../api';
import { useAccountDeletion } from '../useAccountDeletion';
import DeleteAccountDialog from './DeleteAccountDialog';
import InitialsCard from './InitialsCard';
import ProfileSkeleton from './ProfileSkeleton';
import StatCard from './StatCard';

const sectionLabelSx = {
  mb: 1.25,
  color: 'text.secondary',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
} as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ mb: 3.5 }}>
      <Typography component="h2" sx={sectionLabelSx}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export default function Profile() {
  const auth = useAuth();
  const profile = useGetMyProfileQuery();
  const stats = useGetMyStatsQuery();
  const rank = useGetMyRankQuery();
  const { openDialog, dialogProps } = useAccountDeletion();

  if (profile.isLoading || stats.isLoading || rank.isLoading) {
    return <ProfileSkeleton />;
  }

  const user = profile.data;
  const numbers = stats.data;
  const loadError = profile.isError && !user;

  // the share of quarters the user had a stake in that they won
  const winRate =
    numbers && numbers.quartersPlayed > 0
      ? `${((numbers.quarterWins / numbers.quartersPlayed) * 100).toFixed(0)}% win rate`
      : undefined;

  const memberSince = user
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '';

  return (
    <>
      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          We couldn't load your profile. Please try again.
        </Alert>
      )}

      {/* the player card */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 2, sm: 3 },
          p: { xs: 2.5, sm: 3.5 },
          mb: 3.5,
          borderRadius: '22px',
          border: 1,
          borderColor: 'divider',
          background: `radial-gradient(120% 140% at 0% 0%, ${alpha(palette.brand, 0.2)} 0%, transparent 55%), ${palette.field}`,
          // a faint grid behind the card, the board the player plays on
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: `linear-gradient(${alpha(palette.chalk, 0.035)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(palette.chalk, 0.035)} 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
            maskImage: 'linear-gradient(90deg, transparent 30%, black 100%)',
          },
        }}
      >
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            width: { xs: 72, sm: 96 },
            height: { xs: 72, sm: 96 },
            borderRadius: '20px',
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: { xs: '2.4rem', sm: '3.2rem' },
            color: '#fff',
            background: `linear-gradient(140deg, ${palette.brand} 0%, ${palette.brandDeep} 100%)`,
            boxShadow: `0 14px 40px ${alpha(palette.brand, 0.3)}`,
          }}
        >
          {(user?.displayName?.charAt(0) || '?').toUpperCase()}
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.display,
              fontWeight: 800,
              fontSize: { xs: '2.2rem', sm: '3rem' },
              lineHeight: 0.95,
              textTransform: 'uppercase',
              overflowWrap: 'anywhere',
            }}
          >
            {user?.displayName || '–'}
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 0.75, overflowWrap: 'anywhere' }}>
            {user?.email ?? auth.user?.profile?.email}
          </Typography>
          {memberSince && (
            <Typography
              component="span"
              sx={{
                display: 'inline-block',
                mt: 1.25,
                px: 1.1,
                py: 0.35,
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'text.secondary',
                bgcolor: alpha(palette.chalk, 0.06),
                border: 1,
                borderColor: 'divider',
              }}
            >
              Member since {memberSince}
            </Typography>
          )}
        </Box>
      </Box>

      <Section title="Your Numbers">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            borderRadius: '18px',
            border: 1,
            borderColor: 'divider',
            overflow: 'hidden',
            // hairlines between the cells, whichever way the strip wraps
            gap: '1px',
            backgroundColor: palette.line,
            '& > *': { bgcolor: 'background.paper' },
          }}
        >
          <StatCard
            icon={<GridOnIcon sx={{ fontSize: 'inherit' }} />}
            value={numbers?.contestsCreated}
            label="Contests Created"
          />
          <StatCard
            icon={<GroupsIcon sx={{ fontSize: 'inherit' }} />}
            value={numbers?.contestsJoined}
            label="Contests Joined"
          />
          <StatCard
            icon={<GridViewIcon sx={{ fontSize: 'inherit' }} />}
            value={numbers?.squaresClaimed}
            label="Squares Claimed"
          />
          <StatCard
            icon={<EmojiEventsIcon sx={{ fontSize: 'inherit' }} />}
            value={numbers?.quarterWins}
            label="Quarter Wins"
            caption={winRate}
            highlight
          />
        </Box>
      </Section>

      <LeaderboardRankCard
        rank={rank.data ?? null}
        loading={false}
        error={rank.isError}
        animate={false}
      />

      <Section title="Settings">
        <Box
          sx={{
            borderRadius: '18px',
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <InitialsCard initials={user?.defaultInitials} disabled={loadError} />

          {/* danger zone */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
              p: { xs: 2, sm: 2.5 },
              borderTop: 1,
              borderColor: 'divider',
              borderRadius: '0 0 18px 18px',
              bgcolor: alpha(palette.flag, 0.04),
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700, color: 'error.main' }}>Delete account</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Anonymizes your contest history and removes your personal data. Delete or leave any
                active contests first. This cannot be undone.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={openDialog}
              disabled={loadError}
              sx={{ flexShrink: 0 }}
            >
              Delete Account
            </Button>
          </Box>
        </Box>
      </Section>

      <DeleteAccountDialog {...dialogProps} />
    </>
  );
}
