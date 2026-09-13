export type CommentReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

export interface MovieComment {
  id: string;
  movieSlug: string;
  movieTitle?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userEmail?: string;
  userBadges?: string[]; // Danh hiệu sở hữu của tác giả bình luận
  userWatchTimeMinutes?: number; // Tổng số phút cày phim
  rating: number; // 0 (nếu không chấm sao) hoặc 1 - 5 sao
  content: string;
  episodeSlug?: string; // Ví dụ: "tap-1" hoặc "full"
  episodeName?: string; // Ví dụ: "Tập 1"
  isSpoiler?: boolean; // Người dùng bật cờ cảnh báo spoil
  likes: number;
  likedBy: string[]; // Danh sách userId đã thích bình luận này
  reactions?: Record<string, CommentReactionType>; // Bản đồ userId -> loại cảm xúc (like, love, haha, wow, sad, angry)
  reactionCounts?: Partial<Record<CommentReactionType, number>>; // Số lượng từng loại cảm xúc
  createdAt: number; // Timestamp (Date.now())
  updatedAt?: number; // Timestamp cập nhật (Date.now())
  // --- Reply / Thread ---
  parentId?: string;    // ID của comment cha (nếu là reply). Undefined = top-level comment
  replyToUserId?: string;   // ID của user được reply trực tiếp trong thread
  replyToUserName?: string; // Tên của user được reply trực tiếp trong thread
  replyCount?: number;  // Số lượng replies (đếm client-side)
  // --- Moderation & Admin Flagging & Pinning ---
  isPinned?: boolean;           // Ghim bởi Admin
  pinnedAt?: number;            // Thời điểm ghim
  pinnedBy?: string;            // Email hoặc ID của Admin đã ghim
  isFlagged?: boolean;          // Đánh dấu vi phạm thuần phong mỹ tục hoặc spam
  flagReason?: string;         // Lý do bị đánh dấu (vd: "Từ ngữ thô tục", "Spam liên tục")
  flaggedAt?: number;          // Thời điểm bị đánh dấu
  flaggedKeywords?: string[];  // Danh sách từ cấm bị phát hiện
  violationCount?: number;     // Số lần user cố tình thử gửi từ cấm
}

export interface MovieRatingStats {
  averageRating: number;
  totalReviews: number;
  starCounts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
