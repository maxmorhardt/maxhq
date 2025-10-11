import type { RootState } from '../../app/store';
import type { Contest, Square } from '../../types/contest';

export const selectContests = (state: RootState): Contest[] => state.contest.contests;
export const selectCurrentContest = (state: RootState): Contest | null | undefined =>
  state.contest.currentContest;
export const selectCurrentSquare = (state: RootState): Square | null | undefined =>
  state.contest.currentSquare;
export const selectContestLoading = (state: RootState): boolean => state.contest.contestLoading;
export const selectSquareLoading = (state: RootState): boolean => state.contest.squareLoading;
export const selectContestError = (state: RootState): string | null => state.contest.error;
