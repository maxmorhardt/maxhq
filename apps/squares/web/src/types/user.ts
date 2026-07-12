export interface UserProfile {
  email: string;
  displayName: string;
  createdAt: string;
}

export interface UserStats {
  contestsCreated: number;
  contestsJoined: number;
  squaresClaimed: number;
  quarterWins: number;
}
