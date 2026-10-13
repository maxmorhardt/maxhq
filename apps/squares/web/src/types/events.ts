import type { Dispatch } from '@reduxjs/toolkit';
import type { Contest, ContestEvent, Participant } from './contest';

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'failed';

// UI-only callbacks for events that require navigation or toasts
export interface ContestEventCallbacks {
  onConnected?: (contest: Contest, participants: Participant[]) => void;
  onContestDeleted?: () => void;
  onRevoked?: () => void;
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
  onQuarterResultRollback?: (quarter: number, winnerName: string) => void;
  onContestUpdate?: (status?: string) => void;
  onParticipantAdded?: (participant: Participant) => void;
  onParticipantRemoved?: (participant: Participant) => void;
}

export interface HandleContestEventParams {
  event: ContestEvent;
  dispatch: Dispatch;
  currentContestId: string;
  callbacks?: ContestEventCallbacks;
}

// one frame off the wire; id is the stream sequence the client resumes from
export interface StreamFrame {
  id: string | null;
  event: string;
  data: string;
}
