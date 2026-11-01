export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  defaultInitials: string;
  createdAt: string;
  // only on the response that created the profile
  isNew?: boolean;
}

export interface UpdateUserProfileRequest {
  defaultInitials: string;
}

export interface UserStats {
  contestsCreated: number;
  contestsJoined: number;
  squaresClaimed: number;
  quarterWins: number;
  quartersPlayed: number;
}
