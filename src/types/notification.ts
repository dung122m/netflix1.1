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

export type NotificationType =
  | "new_episode"
  | "watchlist_episode"
  | "continue_watching_episode"
  | "actor_movie"
  | "comment_reply"
  | "comment_reaction"
  | "achievement_level"
  | "match_reminder"
  | "system"
  | "movie_recommend";

export interface UserNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  image?: string;
  movieSlug?: string;
  episodeName?: string;
  actorName?: string;
  actorId?: string;
  badgeIcon?: string;
  reactionType?: string;
  reactionCount?: number;
  // --- Reply / Interaction notification ---
  commentId?: string;    // ID của comment gốc được reply hoặc react
  replierName?: string;  // Tên người reply / react
  replierAvatar?: string;
  isRead: boolean;
  createdAt: number;
}

