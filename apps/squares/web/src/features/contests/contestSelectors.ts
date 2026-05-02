import type { RootState } from '../../app/store';
import type { Contest, Invite, Participant, Square } from '../../types/contest';

export const selectContests = (state: RootState): Contest[] => state.contest.contests;
export const selectMyContests = (state: RootState): Contest[] => state.contest.myContests;
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
export const selectContestPagination = (state: RootState) => state.contest.pagination;
export const selectDeleteContestLoading = (state: RootState): boolean =>
  state.contest.deleteContestLoading;
export const selectSquareErrorCode = (state: RootState): number | null =>
  state.contest.squareErrorCode;
