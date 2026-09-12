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
