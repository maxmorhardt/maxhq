import type { RootState } from '../../../app/store';

export const selectLiveContest = (state: RootState) => state.liveContest.contest;
export const selectLiveParticipants = (state: RootState) => state.liveContest.participants;
export const selectLiveActivity = (state: RootState) => state.liveContest.activity;
export const selectStreamStatus = (state: RootState) => state.liveContest.status;
export const selectStreamEnd = (state: RootState) => state.liveContest.ended;
