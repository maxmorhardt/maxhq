export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  quarterWins: number;
  squaresClaimed: number;
  quartersPlayed: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}

export interface LeaderboardRankResponse {
  rank: number;
  totalRanked: number;
  quarterWins: number;
  ranked: boolean;
}
