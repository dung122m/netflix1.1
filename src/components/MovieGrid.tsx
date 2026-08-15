import { MediaCard } from "./sites/netflix-3f78535a/browse-1234abcd/MediaCard"; // Sửa lại đường dẫn nếu cần
import { pickBestMovieImage } from "@/lib/movieMedia";

interface Movie {
  slug: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface MovieGridProps {
  movies: Movie[];
}

export const MovieGrid = ({ movies }: MovieGridProps) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/45 to-zinc-950/45 p-3 sm:p-4 md:p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 xl:gap-6">
        {movies.map((m, index) => {
          const title = m.name || m.title || "Phim";
          const imageUrl = pickBestMovieImage(m, "/default-poster.jpg");
          const genre = m.category?.[0]?.name || "Đang cập nhật";
          const description = m.content
            ? String(m.content)
                .replace(/<[^>]*>/g, "")
                .trim()
            : undefined;

          // Lấy thêm năm sản xuất và thời lượng từ danh sách trả về
          const year = m.year || undefined;
          const time = m.time || m.episode_current || undefined;

          return (
            <MediaCard
              key={m.slug}
              slug={m.slug}
              title={title}
              imageUrl={imageUrl}
              genre={genre}
              description={description}
              time={time}
              year={year}
              priority={index < 8}
            />
          );
        })}
      </div>
    </div>
  );
};
