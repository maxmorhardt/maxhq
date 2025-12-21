import type { WSUpdate } from './contest';

export interface HandleWSEventParams {
  lastMessage: MessageEvent | null;
  onSquareUpdate: (message: WSUpdate) => void;
  onContestUpdate: (message: WSUpdate) => void;
  onQuarterResultUpdate: (message: WSUpdate) => void;
  onContestDeleted: (message: WSUpdate) => void;
  onConnect: (message: WSUpdate) => void;
  onDisconnect: (message: WSUpdate) => void;
}
