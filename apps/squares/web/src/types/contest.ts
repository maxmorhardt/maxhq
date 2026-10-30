export const MAX_CONTEST_SQUARES = 100;

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
  gameId?: string;
  owner: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface RandomClaimResponse {
  squares: Square[];
  requested: number;
}

export interface CreateContestRequest {
  name: string;
  owner: string;
  visibility?: ContestVisibility;
  maxSquares?: number;
  gameId: string;
}

export interface Square {
  id: string;
  contestId: string;
  row: number;
  col: number;
  value: string;
  owner: string;
  ownerName: string;
  version: number;
  // when the square was claimed; updatedAt also moves when the owner changes their initials
  claimedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type FeedRole = 'owned' | 'joined';
export type FeedStatus = 'open' | 'live' | 'active' | 'finished';

export interface ContestFeedParams {
  cursor?: string;
  limit?: number;
  role?: FeedRole;
  status?: FeedStatus;
  search?: string;
}

export interface ContestSummary {
  id: string;
  name: string;
  homeTeam?: string;
  awayTeam?: string;
  homeAbbr?: string;
  awayAbbr?: string;
  status: ContestStatus;
  visibility: ContestVisibility;
  owner: string;
  role: ParticipantRole;
  gameId?: string;
  gameTime?: string;
  // the quarter the game is in, which runs behind status through the break after a quarter pays out
  gamePeriod?: number;
  claimedSquares: number;
  mySquares: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContestFeedResponse {
  contests: ContestSummary[];
  nextCursor?: string;
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

export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled';

export interface GameScore {
  id: string;
  gameId: string;
  quarter: number;
  homeScore: number;
  awayScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  id: string;
  espnId: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbr: string;
  awayAbbr: string;
  gameTime: string;
  week: number;
  season: number;
  seasonType: number;
  status: GameStatus;
  period: number;
  homeScore: number;
  awayScore: number;
  scores?: GameScore[];
  createdAt: string;
  updatedAt: string;
}

export interface ScoreboardWeek {
  season: number;
  seasonType: number;
  week: number;
}

export interface Scoreboard extends ScoreboardWeek {
  // espn name for the week, like "Week 7" or "Wild Card"
  label: string;
  // the calendar weeks either side, across playoff rounds and seasons; absent at the ends
  previous?: ScoreboardWeek;
  next?: ScoreboardWeek;
  games: Game[];
}

export type ActivityEventType =
  | 'square_claimed'
  | 'square_cleared'
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

// contest.updated carries the contest without its squares, results, or game
export type ContestUpdate = Pick<
  Contest,
  | 'name'
  | 'homeTeam'
  | 'awayTeam'
  | 'xLabels'
  | 'yLabels'
  | 'visibility'
  | 'status'
  | 'gameId'
  | 'version'
  | 'updatedAt'
>;

export interface ContestSnapshot {
  contest: Contest;
  participants: Participant[];
}

export interface Participant {
  id: string;
  contestId: string;
  userId: string;
  // the name other players see; emails are shown only to the contest owner
  displayName?: string;
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

export interface InvitePreviewResponse {
  contestId: string;
  contestName: string;
  maxSquares: number;
  owner: string;
  role: string;
  status: ContestStatus;
  claimedSquares: number;
  totalSquares: number;
  homeTeam?: string;
  awayTeam?: string;
  homeAbbr?: string;
  awayAbbr?: string;
  gameTime?: string;
}
