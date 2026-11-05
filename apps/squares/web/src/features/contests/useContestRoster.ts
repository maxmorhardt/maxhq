import { skipToken } from '@reduxjs/toolkit/query';
import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../../app/hooks';
import type { Player, PlayerIdentity } from '../../types/contest';
import { contestsApi, useGetRosterQuery } from './api';

const RETRY_MS = 5_000;

// full names for the owner, refreshed whenever the stream has a player the roster lacks
export function useContestRoster(
  contestId: string,
  isOwner: boolean,
  players: Player[]
): PlayerIdentity[] | undefined {
  const dispatch = useAppDispatch();
  const requested = useRef({ contestId, userIds: new Set<string>() });
  // currentData: a skipped query keeps its old data but can't be refetched
  const { currentData: roster, isError } = useGetRosterQuery(isOwner ? contestId : skipToken);
  const missing = roster
    ? players
        .filter((p) => !roster.some((r) => r.userId === p.userId))
        .map((p) => p.userId)
        .join(',')
    : '';

  // rtk holds an invalidation until an in-flight request settles, then refetches, so ask once per missing player
  useEffect(() => {
    const ids = missing ? missing.split(',') : [];
    const asked =
      requested.current.contestId === contestId ? requested.current.userIds : new Set<string>();
    const unrequested = ids.filter((id) => !asked.has(id));
    // only the still-missing stay asked for, so a player who leaves and rejoins is asked for again
    requested.current = { contestId, userIds: new Set(ids) };
    if (unrequested.length > 0) {
      dispatch(contestsApi.util.invalidateTags([{ type: 'Roster', id: contestId }]));
    }
  }, [missing, contestId, dispatch]);

  // a failed refetch keeps the old roster, so nothing else would ask again
  useEffect(() => {
    if (!missing || !isError) {
      return;
    }
    const id = setTimeout(
      () => dispatch(contestsApi.util.invalidateTags([{ type: 'Roster', id: contestId }])),
      RETRY_MS
    );
    return () => clearTimeout(id);
  }, [missing, isError, contestId, dispatch]);

  return roster;
}
