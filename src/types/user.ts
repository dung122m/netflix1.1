export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: number;
  lastLoginAt: number;
  role?: "admin" | "member";
  // --- Profile tùy chỉnh ---
  bio?: string;                 // Tiểu sử ngắn / Giới thiệu bản thân
  favoriteGenres?: string[];    // Danh sách thể loại yêu thích (vd: ["Hành Động", "Viễn Tưởng"])
  customAvatar?: string;        // Avatar tùy chọn hoặc Ảnh tải từ thiết bị
  watchTimeMinutes?: number;    // Tổng số phút xem phim tích lũy
  badges?: string[];            // Thẻ danh hiệu người dùng sở hữu
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
