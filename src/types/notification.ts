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
  type: "new_episode" | "system" | "movie_recommend";
  title: string;
  message: string;
  link: string;
  image?: string;
  movieSlug?: string;
  episodeName?: string;
  isRead: boolean;
  createdAt: number;
}
