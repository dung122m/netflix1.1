export interface PlayerSettings {
  autoNextEpisode?: boolean;     // Tự động chuyển tập kế tiếp khi hết tập (mặc định: true)
  defaultTheaterMode?: boolean;  // Mặc định mở giao diện Rạp chiếu phim (Theater Mode)
  defaultLightsOff?: boolean;    // Mặc định bật chế độ Tối màn hình (Lights Off)
  autoSubtitle?: boolean;        // Tự động hiển thị phụ đề
  preferredQuality?: "auto" | "1080p" | "720p" | "480p"; // Chất lượng ưu tiên
  playbackSpeed?: number;        // Tốc độ phát mặc định (1, 1.25, 1.5...)
}

export interface FollowedActorItem {
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  actorPhoto?: string;
  knownFor?: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: number;
  lastLoginAt: number;
  updatedAt?: number;
  role?: "admin" | "member";
  // --- Profile tùy chỉnh ---
  bio?: string;                 // Tiểu sử ngắn / Giới thiệu bản thân
  favoriteGenres?: string[];    // Danh sách thể loại yêu thích (vd: ["Hành Động", "Viễn Tưởng"])
  customAvatar?: string;        // Avatar tùy chọn hoặc Ảnh tải từ thiết bị
  watchTimeMinutes?: number;    // Tổng số phút xem phim tích lũy
  badges?: string[];            // Thẻ danh hiệu người dùng sở hữu
  playerSettings?: PlayerSettings; // Cài đặt phát video cá nhân đồng bộ đám mây
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
  lastActiveAt?: number;
  isOnline?: boolean;
  isWatchingNow?: boolean;
  currentWatching?: {
    movieSlug: string;
    movieTitle: string;
    episodeName?: string;
    progressSeconds: number;
    durationSeconds: number;
    progressPercent: number;
    deviceName?: string;
    updatedAt: number;
  };
}
