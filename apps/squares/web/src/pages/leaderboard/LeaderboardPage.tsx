import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Alert, Box, Container, Typography } from '@mui/material';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from 'react-oidc-context';
import LeaderboardPodium, { PODIUM_SIZE } from '../../components/leaderboard/LeaderboardPodium';
import LeaderboardRankCard from '../../components/leaderboard/LeaderboardRankCard';
import LeaderboardTable from '../../components/leaderboard/LeaderboardTable';
import { popIn } from '../../components/profile/animations';
import {
  selectLeaderboard,
  selectLeaderboardError,
  selectLeaderboardLoading,
  selectMyRank,
  selectMyRankError,
  selectMyRankLoading,
} from '../../features/leaderboard/leaderboardSelectors';
import { fetchLeaderboard, fetchMyRank } from '../../features/leaderboard/leaderboardThunks';
import { selectUserProfile } from '../../features/user/userSelectors';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { useAxiosAuth } from '../../hooks/useAxiosAuth';
import { leaderboardKey, toPublicName } from '../../utils/publicName';

// matches the number of players the API returns by default
const TOP_COUNT = 10;

export default function LeaderboardPage() {
  const auth = useAuth();
  const axiosReady = useAxiosAuth();
  const dispatch = useAppDispatch();

  const entries = useAppSelector(selectLeaderboard);
  const loading = useAppSelector(selectLeaderboardLoading);
  const error = useAppSelector(selectLeaderboardError);

  const myRank = useAppSelector(selectMyRank);
  const myRankLoading = useAppSelector(selectMyRankLoading);
  const myRankError = useAppSelector(selectMyRankError);
  const profile = useAppSelector(selectUserProfile);

  useEffect(() => {
    dispatch(fetchLeaderboard(undefined));
  }, [dispatch]);

  useEffect(() => {
    if (!auth.isAuthenticated || !axiosReady) {
      return;
    }

    dispatch(fetchMyRank());
  }, [auth.isAuthenticated, axiosReady, dispatch]);

  const firstLoad = loading && entries.length === 0;

  // a podium only reads as a podium once all three places are filled; below that it is just a list
  const hasPodium = entries.length >= PODIUM_SIZE;
  const podium = hasPodium ? entries.slice(0, PODIUM_SIZE) : [];
  const rest = hasPodium ? entries.slice(PODIUM_SIZE) : entries;

  // the API abbreviates names, so match on the same form plus the rank to disambiguate ties
  const highlightKey =
    profile && myRank?.ranked
      ? leaderboardKey(myRank.rank, toPublicName(profile.displayName))
      : undefined;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, sm: 3 } }}>
      <Helmet>
        <title>Leaderboard – Squares</title>
        <meta
          name="description"
          content="See the top Squares players ranked by all-time quarter wins."
        />
      </Helmet>
      {/* hero */}
      <Box
        sx={{
          textAlign: 'center',
          mb: { xs: 4, md: 5 },
          animation: `${popIn} 0.5s ease-out both`,
        }}
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
          sx={{
            color: 'text.secondary',
            mt: 1,
            mx: 'auto',
            maxWidth: 460,
            lineHeight: 1.6,
          }}
        >
          The best players across every contest, ranked by quarter wins.
        </Typography>
      </Box>

      {auth.isAuthenticated && !error && (
        <LeaderboardRankCard
          rank={myRank}
          loading={myRankLoading && !myRank}
          error={Boolean(myRankError)}
          showAction={false}
        />
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>
          We couldn't load the leaderboard. Please try again.
        </Alert>
      )}

      {!error && !firstLoad && <LeaderboardPodium entries={podium} highlightKey={highlightKey} />}

      {/* the table carries the loading and empty states; it is skipped when the podium holds everyone */}
      {!error && (firstLoad || entries.length === 0 || rest.length > 0) && (
        <LeaderboardTable entries={rest} loading={firstLoad} highlightKey={highlightKey} />
      )}
    </Container>
  );
}
