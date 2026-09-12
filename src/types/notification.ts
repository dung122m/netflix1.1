export interface FollowedSeries {
  slug: string;
  title: string;
  poster: string;
  currentEpisodeCount: number;
  totalEpisodes?: string;
  followedAt: number;
  lastNotifiedEpisode?: string;
  lastNotifiedAt?: number;
}

export interface UserNotification {
  id: string;
  type: "new_episode" | "system" | "movie_recommend" | "comment_reply";
  title: string;
  message: string;
  link: string;
  image?: string;
  movieSlug?: string;
  episodeName?: string;
  // --- Reply notification ---
  commentId?: string;    // ID của comment gốc được reply
  replierName?: string;  // Tên người reply
  replierAvatar?: string;
  isRead: boolean;
  createdAt: number;
}
