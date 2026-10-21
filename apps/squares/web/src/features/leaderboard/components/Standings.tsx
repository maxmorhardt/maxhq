import { Alert, Box } from '@mui/material';
import type { ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { leaderboardKey, toPublicName } from '../../../utils/publicName';
import { useGetMyProfileQuery } from '../../profile/api';
import { useGetLeaderboardQuery, useGetMyRankQuery } from '../api';
import LeaderboardPodium, { PODIUM_SIZE } from './LeaderboardPodium';
import LeaderboardRankCard from './LeaderboardRankCard';
import LeaderboardTable from './LeaderboardTable';

interface Props {
  // the page heading, set beside the signed-in player's standing
  header?: ReactNode;
}

// the leaderboard is public; the signed-in user also sees where they stand
export default function Standings({ header }: Props) {
  const signedIn = useAuth().isAuthenticated;
  const { data: entries = [], isLoading, isError } = useGetLeaderboardQuery();
  const myRank = useGetMyRankQuery(undefined, { skip: !signedIn });
  const { data: profile } = useGetMyProfileQuery(undefined, { skip: !signedIn });

  if (isError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        We couldn't load the leaderboard. Please try again.
      </Alert>
    );
  }

  // a podium only reads as one once all three places are filled; below that it is a list
  const hasPodium = entries.length >= PODIUM_SIZE;
  const podium = hasPodium ? entries.slice(0, PODIUM_SIZE) : [];
  const rest = hasPodium ? entries.slice(PODIUM_SIZE) : entries;

  // the API abbreviates names, so match on the same form plus the rank to tell ties apart
  const highlightKey =
    profile && myRank.data?.ranked
      ? leaderboardKey(myRank.data.rank, toPublicName(profile.displayName))
      : undefined;

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 400px)' },
          alignItems: 'end',
          gap: { xs: 2, md: 4 },
          mb: { xs: 4, md: 5 },
          // the heading's own bottom margin would push the pair apart
          '& > *': { mb: 0 },
        }}
      >
        {header}
        {signedIn && (
          <LeaderboardRankCard
            rank={myRank.data ?? null}
            loading={myRank.isLoading}
            error={myRank.isError}
            showAction={false}
          />
        )}
      </Box>

      {!isLoading && <LeaderboardPodium entries={podium} highlightKey={highlightKey} />}

      {/* the table carries the loading and empty states; it is skipped when the podium holds everyone */}
      {(isLoading || entries.length === 0 || rest.length > 0) && (
        <LeaderboardTable
          entries={rest}
          loading={isLoading}
          highlightKey={highlightKey}
          maxWins={entries[0]?.quarterWins}
        />
      )}
    </>
  );
}
