import dynamic from "next/dynamic";
import Link from "next/link";
import { MovieGrid } from "@/components/MovieGrid";
import { FilterBarClient } from "@/components/FilterBarClient";
import { Footer } from "@/components/sites/netflix-3f78535a/vn-d838105b/FooterSection";

import { movieApi } from "@/services/movieApi";

const NavbarAuth = dynamic(() =>
  import("@/components/sites/netflix-3f78535a/browse-1234abcd/NavbarAuth").then(
    (mod) => mod.NavbarAuth,
  ),
);

const HeroFeatured = dynamic(() =>
  import("@/components/sites/netflix-3f78535a/browse-1234abcd/HeroFeatured").then(
    (mod) => mod.HeroFeatured,
  ),
);

const SetTitleClient = dynamic(() =>
  import("@/components/SetTitleClient").then((mod) => mod.default),
);

// ==========================================
// METADATA
// ==========================================
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    country?: string;
    year?: string;
    keyword?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;

  let title = "Phim Mới Cập Nhật";

  if (params.keyword) {
    title = `Kết quả tìm kiếm: "${params.keyword}"`;
  } else if (params.category || params.country || params.year || params.type) {
    title = "Kết quả lọc";
  }

  return {
    title: `Nanaflix - ${title}`,
  };
}

// ==========================================
// PHÂN TRANG
// ==========================================
const getPagination = (current: number, total: number) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }

  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "...", current - 1, current, current + 1, "...", total];
};

// ==========================================
// BROWSE PAGE
// ==========================================
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    country?: string;
    year?: string;
    keyword?: string;
    page?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;

  const category = params.category || undefined;
  const country = params.country || undefined;
  const year = params.year || undefined;
  const keyword = params.keyword || undefined;
  const type = params.type || undefined;

  const currentPage = params.page ? parseInt(params.page, 10) : 1;

  const response = await movieApi.getMovies({
    category,
    country,
    year,
    keyword,
    page: currentPage,
    limit: 24,
    type,
  });

  const movies = response?.items || [];
  const totalPages = response?.pagination?.totalPages || 50;
  const totalItems = response?.pagination?.totalItems || movies.length;
  const pages = getPagination(currentPage, totalPages);

  let title = "Phim Mới Cập Nhật";

  if (keyword) {
    title = `Kết quả tìm kiếm: "${keyword}"`;
  } else if (category || country || year || type) {
    title = "Kết quả lọc";
  }

  const buildPaginationUrl = (newPage: number) => {
    const query = new URLSearchParams();

    if (category) query.set("category", category);
    if (country) query.set("country", country);
    if (year) query.set("year", year);
    if (keyword) query.set("keyword", keyword);
    if (type) query.set("type", type);
    query.set("page", newPage.toString());

    return `?${query.toString()}`;
  };

  return (
    <div className="bg-black min-h-screen text-white pb-20">
      <NavbarAuth />
      <SetTitleClient title={title} />

      {currentPage === 1 && !keyword && <HeroFeatured movies={movies} />}

      <div className={`px-4 md:px-8 ${keyword ? "mt-24" : "mt-6"}`}>
        {!keyword && <FilterBarClient />}
      </div>

      <div className="px-4 md:px-8 pt-10">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Khám phá bộ sưu tập phim chất lượng cao từ nhiều nguồn, cập nhật
              liên tục.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs md:text-sm text-gray-200">
            <span>{totalItems.toLocaleString("vi-VN")} phim</span>
            <span className="text-white/40">•</span>
            <span>Trang {currentPage}</span>
          </div>
        </div>

        {movies.length > 0 ? (
          <>
            <MovieGrid movies={movies} />

            <div className="flex justify-center items-center gap-2 mt-16 flex-wrap">
              <Link
                href={buildPaginationUrl(Math.max(1, currentPage - 1))}
                className={`px-3 py-2 rounded font-semibold transition ${
                  currentPage === 1
                    ? "bg-zinc-900 text-zinc-600 pointer-events-none"
                    : "bg-zinc-800 text-white hover:bg-zinc-700"
                }`}
              >
                &laquo; Trở lại
              </Link>

              {pages.map((p, index) => {
                if (p === "...") {
                  return (
                    <span key={index} className="px-2 text-gray-500">
                      ...
                    </span>
                  );
                }
                return (
                  <Link
                    key={index}
                    href={buildPaginationUrl(p as number)}
                    className={`w-10 h-10 flex items-center justify-center rounded font-semibold transition-colors ${
                      currentPage === p
                        ? "bg-netflix-red text-white"
                        : "bg-zinc-800 text-gray-300 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}

              <Link
                href={buildPaginationUrl(currentPage + 1)}
                className={`px-3 py-2 rounded font-semibold transition ${
                  currentPage === totalPages || movies.length === 0
                    ? "bg-zinc-900 text-zinc-600 pointer-events-none"
                    : "bg-zinc-800 text-white hover:bg-zinc-700"
                }`}
              >
                Tiếp &raquo;
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-32 text-gray-500 text-lg">
            Không tìm thấy dữ liệu phim.
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
