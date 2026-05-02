export type ContestStatus = 'ACTIVE' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FINISHED' | 'DELETED';

export type ContestVisibility = 'public' | 'private';

export type ParticipantRole = 'owner' | 'participant' | 'viewer';

export interface Contest {
  id: string;
  name: string;
  xLabels: number[];
  yLabels: number[];
  homeTeam?: string;
  awayTeam?: string;
  status: ContestStatus;
  visibility: ContestVisibility;
  squares: Square[];
  quarterResults?: QuarterResult[];
  owner: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface CreateContestRequest {
  name: string;
  owner: string;
  homeTeam?: string;
  awayTeam?: string;
  visibility?: ContestVisibility;
}

export interface Square {
  id: string;
  contestId: string;
  row: number;
  col: number;
  value: string;
  owner: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface WSUpdate {
  type:
    | 'square_update'
    | 'contest_update'
    | 'quarter_result_update'
    | 'chat_message'
    | 'connected'
    | 'disconnected'
    | 'contest_deleted'
    | 'participant_removed'
    | 'participant_added';
  contestId: string;
  connectionId?: string;
  updatedBy: string;
  timestamp: string;
  message?: string;
  square?: Square;
  contest?: Contest;
  quarterResult?: QuarterResult;
  participant?: Participant;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface PaginatedContestsResponse {
  contests: Contest[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface QuarterResult {
  id: string;
  contestId: string;
  quarter: number;
  homeTeamScore: number;
  awayTeamScore: number;
  winnerRow: number;
  winnerCol: number;
  winner: string;
  winnerName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface QuarterResultRequest {
  homeTeamScore: number;
  awayTeamScore: number;
}

export interface UpdateSquareRequest {
  value: string;
  owner: string;
}

export type ActivityEventType =
  | 'square_claimed'
  | 'score_update'
  | 'quarter_winner'
  | 'contest_started'
  | 'contest_status'
  | 'participant_added'
  | 'participant_removed';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  message: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
}

export interface UpdateContestRequest {
  homeTeam?: string;
  awayTeam?: string;
  visibility?: ContestVisibility;
}

export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactResponse {
  message: string;
}

export interface Participant {
  id: string;
  contestId: string;
  userId: string;
  inviteId: string;
  role: ParticipantRole;
  maxSquares: number;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateParticipantRequest {
  role?: ParticipantRole;
  maxSquares?: number;
}

export interface Invite {
  id: string;
  contestId: string;
  token: string;
  maxSquares: number;
  role: ParticipantRole;
  maxUses?: number;
  uses: number;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface CreateInviteRequest {
  maxSquares: number;
  role: ParticipantRole;
  maxUses?: number;
  expiresIn?: number;
}

export interface InviteResponse {
  inviteUrl: string;
  token: string;
}

export interface InvitePreviewResponse {
  contestName: string;
  maxSquares: number;
  owner: string;
  role: string;
}
