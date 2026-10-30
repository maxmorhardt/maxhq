import type { InfiniteData } from '@reduxjs/toolkit/query';
import type { RootState } from '../../../app/store';
import type { ContestFeedResponse, ContestStatus } from '../../../types/contest';

export const selectLiveContest = (state: RootState) => state.liveContest.contest;
export const selectLiveParticipants = (state: RootState) => state.liveContest.participants;
export const selectLiveActivity = (state: RootState) => state.liveContest.activity;
export const selectStreamStatus = (state: RootState) => state.liveContest.status;
export const selectStreamEnd = (state: RootState) => state.liveContest.ended;

// the status a contests list already loaded for this contest, before its page has read it
export function selectListedStatus(
  state: RootState,
  contestId: string | undefined
): ContestStatus | undefined {
  for (const query of Object.values(state.api.queries)) {
    if (!contestId || query?.endpointName !== 'getContestFeed' || !query.data) {
      continue;
    }
    const { pages } = query.data as InfiniteData<ContestFeedResponse, string>;
    const listed = pages.flatMap((page) => page.contests).find((c) => c.id === contestId);
    if (listed) {
      return listed.status;
    }
  }
  return undefined;
}
