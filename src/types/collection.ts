export type CollectionItemType = "movie" | "series" | "episode";

export interface CollectionMovieItem {
  slug: string;
  title: string;
  poster: string;
  year?: string | number;
  quality?: string;
  category?: string;
  addedAt: number;
  itemType?: CollectionItemType;
  seriesSlug?: string;
  seriesTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  seasonName?: string;
}

export interface MovieCollection {
  id: string;
  userId: string;
  creatorName: string;
  creatorPhoto?: string;
  name: string;
  description?: string;
  isPublic: boolean;
  movies: CollectionMovieItem[];
  createdAt: number;
  updatedAt: number;
}
