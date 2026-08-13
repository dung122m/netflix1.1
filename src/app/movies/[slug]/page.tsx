import { movieApi } from "@/services/movieApi";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  buildMovieDescriptionFallback,
  pickBestMovieImage,
} from "@/lib/movieMedia";

const NavbarAuth = dynamic(() =>
  import("@/components/sites/netflix-3f78535a/browse-1234abcd/NavbarAuth").then(
    (mod) => mod.NavbarAuth,
  ),
);
const SetTitleClient = dynamic(() =>
  import("@/components/SetTitleClient").then((mod) => mod.default),
);

// Tạo metadata động để Next.js cập nhật <title> khi truy cập trang phim
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const data = await movieApi.getMovieDetail(slug);
    const rawTitle = data?.movie?.name || data?.movie?.title || "Phim";
    return { title: `Nanaflix - ${rawTitle}` };
  } catch {
    return { title: "Nanaflix - Phim" };
  }
}

export default async function MovieDetail({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ep?: string }>;
}) {
  const { slug } = await params;
  const { ep } = await searchParams;

  const data = await movieApi.getMovieDetail(slug);
  if (!data || !data.movie) {
    return (
      <div className="text-white text-center mt-20">
        <h1>Lỗi API rồi! Hãy xem Terminal (màn hình đen) để biết chi tiết.</h1>
        <pre className="text-left bg-gray-900 p-4 mt-4 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  const { movie, episodes } = data;
  const title = movie.name || movie.title;
  const description =
    (movie.content &&
      String(movie.content)
        .replace(/<[^>]*>/g, "")
        .trim()) ||
    buildMovieDescriptionFallback({
      origin_name: movie.origin_name,
      year: movie.year,
      time: movie.time,
      lang: movie.lang,
      quality: movie.quality,
      category: movie.category,
      country: movie.country,
      director: movie.director,
    }) ||
    "Nội dung phim đang được cập nhật.";

  const genres =
    movie.category?.map((c: { name?: string }) => c.name).join(", ") ||
    movie.genre;
  const countries =
    movie.country?.map((c: { name?: string }) => c.name).join(", ") ||
    "Đang cập nhật";
  const directors =
    (movie.director || []).slice(0, 3).join(", ") || "Đang cập nhật";
  const actors = (movie.actor || []).slice(0, 6).join(", ");

  const serverData = episodes?.[0]?.server_data || [];
  const isTrailerOnly =
    movie.status === "trailer" ||
    serverData.length === 0 ||
    movie.episode_current === "Trailer";
  const activeEpisode = ep
    ? serverData.find((tap: { slug?: string }) => tap.slug === ep)
    : serverData[0];
  const videoLink = activeEpisode?.link_embed;
  const embedSrc = (() => {
    if (!videoLink) return undefined;
    try {
      const url = new URL(videoLink);
      if (!url.searchParams.has("autoplay"))
        url.searchParams.set("autoplay", "1");
      return url.toString();
    } catch {
      return videoLink;
    }
  })();

  // Gợi ý phim theo cùng thể loại trước, thiếu thì bổ sung theo quốc gia
  const primaryGenreSlug = movie.category?.[0]?.slug;
  const primaryCountrySlug = movie.country?.[0]?.slug;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recommendationPool: any[] = [];

  if (primaryGenreSlug) {
    const byGenre = await {
      type: "the-loai",
      slug: primaryGenreSlug,
      page: 1,
    };
    recommendationPool.push(...(byGenre?.data?.items || byGenre?.items || []));
  }

  if (recommendationPool.length < 10 && primaryCountrySlug) {
    const byCountry = await movieApi.getMovies({
      type: "quoc-gia",
      slug: primaryCountrySlug,
      page: 1,
    });
    recommendationPool.push(
      ...(byCountry?.data?.items || byCountry?.items || []),
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deduped = new Map<string, any>();
  for (const item of recommendationPool) {
    if (!item?.slug || item.slug === movie.slug) continue;
    if (!deduped.has(item.slug)) deduped.set(item.slug, item);
  }
  const recommendedMovies = Array.from(deduped.values()).slice(0, 12);

  return (
    <div className="bg-black min-h-screen text-white pb-20">
      <NavbarAuth />
      <SetTitleClient title={title} />

      <div className="w-full pt-[62px] md:pt-[74px] bg-black px-3 md:px-6">
        <div className="w-full max-w-[1800px] mx-auto aspect-video bg-zinc-900 relative overflow-hidden rounded-xl md:rounded-2xl border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.55)]">
          {videoLink ? (
            <iframe
              src={embedSrc}
              className="w-full h-full absolute inset-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; full-screen"
              allowFullScreen={true}
              frameBorder="0"
              title={`Đang phát ${activeEpisode?.name}`}
            ></iframe>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center border border-white/10 relative">
              <Image
                src={pickBestMovieImage(movie, "/default-hero.jpg")}
                alt={title}
                fill
                quality={95}
                className="object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-black/55" />
              <div className="relative z-10 text-center px-6">
                <p className="text-white text-lg md:text-2xl font-semibold">
                  {isTrailerOnly
                    ? "Phim đang ở trạng thái trailer/sắp chiếu"
                    : "Video chưa được cập nhật"}
                </p>
                <p className="text-gray-300 mt-2">
                  {isTrailerOnly
                    ? "Hiện chưa có tập phát chính thức. Vui lòng quay lại sau."
                    : "Nguồn phát hiện chưa sẵn sàng."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 md:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/75 to-zinc-950/70 p-5 md:p-7">
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
              {title}{" "}
              <span className="text-xl md:text-3xl text-gray-400 font-normal">
                {isTrailerOnly
                  ? "• Trailer"
                  : `• Tập ${activeEpisode?.name || "1"}`}
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-2 mt-4 text-sm text-gray-200">
              <span className="rounded-md bg-white text-black px-2 py-1 text-xs font-bold">
                {movie.quality || "HD"}
              </span>
              <span className="rounded-md border border-white/20 px-2 py-1">
                {movie.year}
              </span>
              <span className="rounded-md border border-white/20 px-2 py-1">
                {movie.time ? `${movie.time} phút` : "N/A"}
              </span>
              <span className="rounded-md border border-white/20 px-2 py-1">
                {movie.lang || "Vietsub"}
              </span>
              <span className="rounded-md border border-netflix-red/30 bg-netflix-red/90 px-2 py-1 text-white font-semibold">
                {isTrailerOnly ? "Trailer" : "Đang phát"}
              </span>
            </div>

            <p className="mt-5 text-gray-300 leading-relaxed text-base md:text-lg">
              {description}
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-gray-400">Thể loại</p>
                <p className="text-white mt-1">{genres}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-gray-400">Quốc gia</p>
                <p className="text-white mt-1">{countries}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-gray-400">Đạo diễn</p>
                <p className="text-white mt-1">{directors}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-gray-400">Diễn viên</p>
                <p className="text-white mt-1 line-clamp-2">
                  {actors || "Đang cập nhật"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 md:p-6 h-fit max-h-[680px] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Danh sách tập</h3>
            {serverData.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-3">
                {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  serverData.map((tap: any) => {
                    const isActive = activeEpisode?.slug === tap.slug;
                    return (
                      <Link
                        key={tap.slug}
                        href={`?ep=${tap.slug}`}
                        scroll={false}
                        className={`flex items-center justify-center text-center py-3 rounded-lg font-semibold transition ${
                          isActive
                            ? "bg-netflix-red text-white shadow-lg"
                            : "bg-zinc-800 text-gray-300 hover:bg-zinc-700 hover:text-white"
                        }`}
                      >
                        {tap.name}
                      </Link>
                    );
                  })
                }
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-black/25 p-4 text-gray-300">
                Chưa có tập phim khả dụng.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold">
              Gợi ý cho bạn
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Ưu tiên cùng thể loại và quốc gia để phù hợp gu xem hiện tại.
            </p>
          </div>
        </div>

        {recommendedMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recommendedMovies.map((item) => {
              const recTitle = item.name || item.title || "Phim";
              const recImage = pickBestMovieImage(item, "/default-poster.jpg");
              return (
                <Link
                  key={item.slug}
                  href={`/movies/${item.slug}`}
                  className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 bg-zinc-900 hover:border-white/25 transition"
                >
                  <Image
                    src={recImage}
                    alt={recTitle}
                    fill
                    quality={95}
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-white text-sm font-semibold line-clamp-2">
                      {recTitle}
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      {item.year || "N/A"} • {item.quality || "HD"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 text-gray-300">
            Chưa có đủ dữ liệu để đề xuất phim liên quan.
          </div>
        )}
      </div>
    </div>
  );
}
