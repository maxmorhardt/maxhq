import { skipToken } from '@reduxjs/toolkit/query';
import { useEffect } from 'react';
import { useAppDispatch } from '../../app/hooks';
import type { Participant, ParticipantIdentity } from '../../types/contest';
import { contestsApi, useGetRosterQuery } from './api';

// full names for the owner, refreshed whenever the stream has a player the roster lacks
export function useContestRoster(
  contestId: string,
  isOwner: boolean,
  participants: Participant[]
): ParticipantIdentity[] | undefined {
  const dispatch = useAppDispatch();
  // currentData: a skipped query keeps its old data but can't be refetched
  const { currentData: roster } = useGetRosterQuery(isOwner ? contestId : skipToken);
  const missing = roster
    ? participants
        .filter((p) => !roster.some((r) => r.userId === p.userId))
        .map((p) => p.userId)
        .join(',')
    : '';

  // rtk holds an invalidation until an in-flight request settles, then refetches
  useEffect(() => {
    if (missing) {
      dispatch(contestsApi.util.invalidateTags([{ type: 'Roster', id: contestId }]));
    }
  }, [missing, contestId, dispatch]);

  return roster;
}
