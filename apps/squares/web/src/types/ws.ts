import type { Dispatch } from '@reduxjs/toolkit';
import type { Contest, Participant } from './contest';

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'failed';

// UI-only callbacks for actions that require navigation or toasts
export interface WSUICallbacks {
  onConnected?: (contest: Contest, participants: Participant[]) => void;
  onContestDeleted?: () => void;
  onError?: (error: string) => void;
  onSquareUpdate?: (value: string, row: number, col: number, ownerName: string) => void;
  onQuarterResultUpdate?: (
    quarter: number,
    winnerName: string,
    homeScore: number,
    awayScore: number,
    winnerRow: number,
    winnerCol: number,
    winner: string
  ) => void;
  onContestUpdate?: (status?: string) => void;
  onChatMessage?: (sender: string, message: string, timestamp: string) => void;
  onParticipantAdded?: (participant: Participant) => void;
  onParticipantRemoved?: (participant: Participant) => void;
}

// Internal handler params with dispatch and validation context
export interface HandleWSEventParams {
  lastMessage: MessageEvent | null;
  dispatch: Dispatch;
  currentContestId: string;
  lastProcessedMessageRef: React.RefObject<string | null>;
  callbacks?: WSUICallbacks;
}
