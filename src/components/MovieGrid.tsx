import { MediaCard } from "./sites/netflix-3f78535a/browse-1234abcd/MediaCard";
import { normalizeMovie } from "@/lib/movieMedia";

interface MovieGridProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movies: any[];
}

export const MovieGrid = ({ movies }: MovieGridProps) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/45 to-zinc-950/45 p-2 sm:p-4 md:p-5">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5 xl:gap-6">
        {movies.map((m, index) => {
          const norm = normalizeMovie(m);

          return (
            <MediaCard
              key={norm.slug || index}
              slug={norm.slug}
              title={norm.title}
              imageUrl={norm.imageUrl}
              genre={norm.genre}
              description={norm.description}
              time={norm.time}
              year={norm.year}
              rating={norm.score}
              quality={norm.quality}
              lang={norm.lang}
              chieurap={norm.chieurap}
              sub_docquyen={norm.sub_docquyen}
              rank={index < 10 ? index + 1 : undefined}
              priority={index < 4}
            />
          );
        })}
      </div>
    </div>
  );
};

