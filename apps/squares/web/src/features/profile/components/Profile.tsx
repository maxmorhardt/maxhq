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

  const winShare =
    numbers && numbers.quartersPlayed > 0
      ? (numbers.quarterWins / numbers.quartersPlayed) * 100
      : undefined;

  return (
    <>
      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          We couldn't load your profile. Please try again.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 340px) minmax(0, 1fr)' },
          gap: { xs: 3, md: 4 },
          alignItems: 'start',
        }}
      >
        {/* the ID card: who you are, and the initials you play under */}
        <Box
          component="aside"
          sx={{
            position: { md: 'sticky' },
            top: { md: 96 },
            borderRadius: '22px',
            border: 1,
            borderColor: 'divider',
            bgcolor: palette.field,
            overflow: 'hidden',
          }}
        >
          <Box
            aria-hidden
            sx={{
              height: 84,
              // a few yard lines across the band
              backgroundImage: `repeating-linear-gradient(90deg, ${alpha(palette.chalk, 0.18)} 0 2px, transparent 2px 48px), linear-gradient(120deg, ${palette.brandDeep}, ${palette.brand} 60%, ${alpha(palette.gold, 0.7)})`,
            }}
          />
          <Box sx={{ px: { xs: 2.5, sm: 3 }, pb: 3 }}>
            <Box
              aria-hidden
              sx={{
                mt: '-44px',
                display: 'grid',
                placeItems: 'center',
                width: 88,
                height: 88,
                borderRadius: '22px',
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: '3rem',
                color: '#fff',
                bgcolor: palette.night,
                border: 4,
                borderColor: palette.field,
                boxShadow: `inset 0 0 0 2px ${alpha(palette.brand, 0.6)}`,
              }}
            >
              {(user?.displayName?.charAt(0) || '?').toUpperCase()}
            </Box>
            <Typography
              component="h1"
              sx={{
                mt: 2,
                fontFamily: fonts.display,
                fontWeight: 800,
                fontSize: '2.2rem',
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
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Member since {memberSince}
              </Typography>
            )}

            <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <InitialsCard initials={user?.defaultInitials} disabled={loadError} />
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gap: 3.5, minWidth: 0 }}>
          <Section title="Career">
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, minmax(0, 1fr))' },
                gap: 1.5,
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
                progress={winShare}
                highlight
              />
            </Box>
          </Section>

          <Section title="Standing">
            <LeaderboardRankCard
              rank={rank.data ?? null}
              loading={false}
              error={rank.isError}
              animate={false}
            />
          </Section>

          <Section title="Account">
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2,
                p: { xs: 2, sm: 2.5 },
                borderRadius: '18px',
                border: 1,
                borderColor: alpha(palette.flag, 0.35),
                bgcolor: alpha(palette.flag, 0.04),
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, color: 'error.main' }}>
                  Delete account
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Anonymizes your contest history, removes your personal data, and signs you out on
                  every device. Delete or leave any active contests first. This cannot be undone.
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
          </Section>
        </Box>
      </Box>

      <DeleteAccountDialog {...dialogProps} />
    </>
  );
}
