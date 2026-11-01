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
  // as the leaderboard shows it, to find your own row
  displayName: string;
}
