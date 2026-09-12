export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: number;
  lastLoginAt: number;
  role?: "admin" | "member";
}

export interface MemberWithStats extends UserProfile {
  commentsCount: number;
  avgRatingGiven: number;
  spoilerCount: number;
}
