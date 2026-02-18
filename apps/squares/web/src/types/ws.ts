import type { Dispatch } from '@reduxjs/toolkit';

// UI-only callbacks for actions that require navigation or toasts
export interface WSUICallbacks {
  onContestDeleted?: () => void; // Navigate away when contest is deleted
  onError?: (error: string) => void; // Show error toast
}

// Internal handler params with dispatch and validation context
export interface HandleWSEventParams {
  lastMessage: MessageEvent | null;
  dispatch: Dispatch;
  currentContestId: string;
  lastProcessedMessageRef: React.MutableRefObject<string | null>;
  callbacks?: WSUICallbacks;
}
