export const MAX_CONTEST_SQUARES = 100;
export const WATCHING_MESSAGE =
  "You're watching this contest. Ask the owner for the invite link to play.";

export type ContestStatus = 'ACTIVE' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FINISHED' | 'DELETED';

export type ContestVisibility = 'public' | 'private';

export type PlayerRole = 'owner' | 'player';

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
}

export interface PlayerIdentity {
  userId: string;
  fullName: string;
}

export interface RandomClaimResponse {
  squares: Square[];
  requested: number;
}

export interface CreateContestRequest {
  name: string;
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
  ownerName?: string;
  role: PlayerRole;
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

// a week by number, or the week of the next game that hasn't kicked off
export type ScoreboardQuery = ScoreboardWeek | { upcoming: true };

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
  | 'player_added'
  | 'player_removed';

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
  players?: Player[];
  participants?: Player[];
  viewerId: string;
}

export interface Player {
  id: string;
  contestId: string;
  userId: string;
  displayName: string;
  role: PlayerRole;
  maxSquares: number;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContestBan {
  userId: string;
  displayName: string;
  bannedAt: string;
}

export interface InviteLink {
  token: string;
}

export interface InvitePreviewResponse {
  contestId: string;
  contestName: string;
  ownerName?: string;
  status: ContestStatus;
  claimedSquares: number;
  totalSquares: number;
  homeTeam?: string;
  awayTeam?: string;
  homeAbbr?: string;
  awayAbbr?: string;
  gameTime?: string;
}
