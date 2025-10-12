import type { ContestChannelResponse } from './contest';

export interface HandleWSEventParams {
  lastMessage: MessageEvent | null;
  onSquareUpdate: (message: ContestChannelResponse) => void;
  onContestUpdate: (message: ContestChannelResponse) => void;
  onDisconnect?: (message: ContestChannelResponse) => void;
}
