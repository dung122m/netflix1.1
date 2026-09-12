export interface PlaybackSession {
  sessionId: string;
  deviceType: "Điện thoại" | "Máy tính" | "Tablet";
  movieSlug: string;
  movieTitle: string;
  episodeName?: string;
  episodeSlug?: string;
  currentTime: number;
  duration: number;
  posterUrl?: string;
  updatedAt: number;
}
