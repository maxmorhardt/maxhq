import type { RootState } from '../../app/store';
import type { Contest, ContestSummary, Invite, Participant, Square } from '../../types/contest';

const EMPTY_FEED: ContestSummary[] = [];

export const selectContestFeed = (state: RootState): ContestSummary[] =>
  state.contest.feed.items ?? EMPTY_FEED;
export const selectContestFeedFetched = (state: RootState): boolean =>
  state.contest.feed.items !== null;
export const selectContestFeedCursor = (state: RootState): string | null =>
  state.contest.feed.nextCursor;
export const selectContestFeedLoading = (state: RootState): boolean => state.contest.feed.loading;
export const selectContestFeedLoadingMore = (state: RootState): boolean =>
  state.contest.feed.loadingMore;
export const selectCurrentContest = (state: RootState): Contest | null | undefined =>
  state.contest.currentContest;
export const selectCurrentSquare = (state: RootState): Square | null | undefined =>
  state.contest.currentSquare;
export const selectParticipants = (state: RootState): Participant[] => state.contest.participants;
export const selectInvites = (state: RootState): Invite[] => state.contest.invites;
export const selectContestLoading = (state: RootState): boolean => state.contest.contestLoading;
export const selectSquareLoading = (state: RootState): boolean => state.contest.squareLoading;
export const selectParticipantsLoading = (state: RootState): boolean =>
  state.contest.participantsLoading;
export const selectInvitesLoading = (state: RootState): boolean => state.contest.invitesLoading;
export const selectContestError = (state: RootState): string | null => state.contest.error;
export const selectDeleteContestLoading = (state: RootState): boolean =>
  state.contest.deleteContestLoading;
export const selectSquareErrorCode = (state: RootState): number | null =>
  state.contest.squareErrorCode;
