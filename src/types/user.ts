export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: number;
  lastLoginAt: number;
  role?: "admin" | "member";
  // --- Moderation & Violations ---
  isCommentRestricted?: boolean; // Bị hạn chế quyền bình luận
  violationsCount?: number;     // Số lần cố tình vi phạm
  lastViolationAt?: number;
  lastViolationReason?: string;
}

export interface MemberWithStats extends UserProfile {
  commentsCount: number;
  avgRatingGiven: number;
  spoilerCount: number;
  flaggedCount?: number;
}
