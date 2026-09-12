export interface CollectionMovieItem {
  slug: string;
  title: string;
  poster: string;
  year?: string | number;
  quality?: string;
  category?: string;
  addedAt: number;
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
