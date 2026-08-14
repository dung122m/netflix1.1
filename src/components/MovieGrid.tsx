import MovieCard from "@/components/MovieCard";

interface Movie {
  slug: string;
  [key: string]: unknown;
}

interface MovieGridProps {
  movies: Movie[];
}

export const MovieGrid = ({ movies }: MovieGridProps) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/45 to-zinc-950/45 p-3 sm:p-4 md:p-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
        {movies.map((m) => (
          <MovieCard key={m.slug} m={m} />
        ))}
      </div>
    </div>
  );
};
