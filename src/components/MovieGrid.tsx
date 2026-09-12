import React from "react";
import { MediaCard } from "./sites/netflix-3f78535a/browse-1234abcd/MediaCard";
import { normalizeMovie } from "@/lib/movieMedia";

interface MovieGridProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movies: any[];
}

const MovieGridInner = ({ movies }: MovieGridProps) => {
  return (
    <div className="movie-grid-container rounded-2xl sm:rounded-3xl border border-white/10 p-2.5 sm:p-5 md:p-6 shadow-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3.5 sm:gap-4 md:gap-6">
        {movies.map((m, index) => {
          const norm = normalizeMovie(m);
          const bestThumb = norm.thumbUrl || norm.imageUrl;

          return (
            <MediaCard
              key={norm.slug || index}
              slug={norm.slug}
              title={norm.title}
              origin_name={norm.origin_name}
              imageUrl={bestThumb}
              posterUrl={norm.posterUrl}
              thumbUrl={norm.thumbUrl}
              genre={norm.genre}
              description={norm.description}
              time={norm.time}
              year={norm.year}
              rating={norm.score}
              quality={norm.quality}
              lang={norm.lang}
              chieurap={norm.chieurap}
              sub_docquyen={norm.sub_docquyen}
              actor={norm.actor}
              director={norm.director}
              country={norm.country}
              type_name={norm.type_name}
              hasTrailer={norm.hasTrailer}
              trailer_url={norm.trailer_url}
              isTrailerOnly={norm.isTrailerOnly}
              priority={index < 8}
            />
          );
        })}
      </div>
    </div>
  );
};

export const MovieGrid = React.memo(MovieGridInner);
export default MovieGrid;
