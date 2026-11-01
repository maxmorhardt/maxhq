export interface UserProfile {
  // how contests name this user; never the email
  userId: string;
  email: string;
  displayName: string;
  defaultInitials: string;
  createdAt: string;
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
