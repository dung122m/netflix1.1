export interface MovieComment {
  id: string;
  movieSlug: string;
  movieTitle?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userEmail?: string;
  rating: number; // 0 (nếu không chấm sao) hoặc 1 - 5 sao
  content: string;
  episodeSlug?: string; // Ví dụ: "tap-1" hoặc "full"
  episodeName?: string; // Ví dụ: "Tập 1"
  isSpoiler?: boolean; // Người dùng bật cờ cảnh báo spoil
  likes: number;
  likedBy: string[]; // Danh sách userId đã thích bình luận này
  createdAt: number; // Timestamp (Date.now())
  updatedAt?: number; // Timestamp cập nhật (Date.now())
  // --- Reply / Thread ---
  parentId?: string;    // ID của comment cha (nếu là reply). Undefined = top-level comment
  replyToUserId?: string;   // ID của user được reply trực tiếp trong thread
  replyToUserName?: string; // Tên của user được reply trực tiếp trong thread
  replyCount?: number;  // Số lượng replies (đếm client-side)
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
