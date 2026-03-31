import type { Dispatch } from '@reduxjs/toolkit';

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'failed';

// UI-only callbacks for actions that require navigation or toasts
export interface WSUICallbacks {
  onContestDeleted?: () => void;
  onError?: (error: string) => void;
  onSquareUpdate?: (value: string, row: number, col: number, ownerName: string) => void;
  onQuarterResultUpdate?: (
    quarter: number,
    winnerName: string,
    homeScore: number,
    awayScore: number
  ) => void;
  onContestUpdate?: (status?: string) => void;
  onChatMessage?: (sender: string, message: string, timestamp: string) => void;
}

// Internal handler params with dispatch and validation context
export interface HandleWSEventParams {
  lastMessage: MessageEvent | null;
  dispatch: Dispatch;
  currentContestId: string;
  lastProcessedMessageRef: React.MutableRefObject<string | null>;
  callbacks?: WSUICallbacks;
}
