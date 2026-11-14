import React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { MovieSynopsis } from "@/components/movies/MovieSynopsis";
import { ActorChipClient } from "@/components/actors/ActorChipClient";
import { NamedSlugItem } from "@/services/movies/detailPageData";

interface MovieSynopsisAndFactsSectionProps {
  description: string;
  originName?: string;
  altNames: string[];
  formattedModified: string | null;
  categoryList: NamedSlugItem[];
  countryList: NamedSlugItem[];
  directorList: string[];
  actorCount: number;
  castSlot?: React.ReactNode;
}

export function MovieSynopsisAndFactsSection({
  description,
  originName,
  altNames,
  formattedModified,
  categoryList,
  countryList,
  directorList,
  actorCount: _actorCount,
  castSlot,
}: MovieSynopsisAndFactsSectionProps) {
  const normalizedOrigin = (originName || "").trim().toLowerCase();
  const uniqueAltNames = Array.from(
    new Set(
      altNames
        .map((n) => n?.trim())
        .filter((n): n is string => Boolean(n && n.toLowerCase() !== normalizedOrigin))
    )
  );

  return (
    <div
      id="section-info"
      className="scroll-mt-[116px] sm:scroll-mt-[124px] space-y-4 py-6 border-b border-white/[0.08]"
    >
      <MovieSynopsis synopsis={description} originName={originName} />

      {/* KHỐI THÔNG TIN PHIM LIỀN MẠCH (THỂ LOẠI, QUỐC GIA, ĐẠO DIỄN, TÊN GỌI KHÁC, CẬP NHẬT) */}
      {(categoryList.length > 0 ||
        countryList.length > 0 ||
        directorList.length > 0 ||
        uniqueAltNames.length > 0 ||
        formattedModified ||
        castSlot) && (
        <div className="mt-5 rounded-2xl bg-zinc-900/40 p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
          {/* THỂ LOẠI */}
          {categoryList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-zinc-400 font-medium min-w-[75px] flex-shrink-0 text-xs">
                Thể loại:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {categoryList.map((cat, idx) => (
                  <Link
                    key={cat.slug || idx}
                    prefetch={false}
                    href={
                      cat.slug
                        ? `/browse?category=${cat.slug}`
                        : `/browse?keyword=${encodeURIComponent(cat.name)}`
                    }
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white text-xs font-medium transition cursor-pointer"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* QUỐC GIA */}
          {countryList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-zinc-400 font-medium min-w-[75px] flex-shrink-0 text-xs">
                Quốc gia:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {countryList.map((cnt, idx) => (
                  <Link
                    key={cnt.slug || idx}
                    prefetch={false}
                    href={
                      cnt.slug
                        ? `/browse?country=${cnt.slug}`
                        : `/browse?keyword=${encodeURIComponent(cnt.name)}`
                    }
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white text-xs font-medium transition cursor-pointer"
                  >
                    {cnt.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ĐẠO DIỄN */}
          {directorList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-zinc-400 font-medium min-w-[75px] flex-shrink-0 text-xs">
                Đạo diễn:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {directorList.slice(0, 4).map((d, idx) => (
                  <ActorChipClient key={idx} name={d} isDirector={true} />
                ))}
              </div>
            </div>
          )}

          {/* TÊN GỌI KHÁC (ĐÃ LỌC TRÙNG VÀ BỎ TÊN GỐC ĐÃ HIỂN THỊ) */}
          {uniqueAltNames.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-2 pt-2.5 border-t border-white/[0.04]">
              <span className="text-zinc-500 font-medium min-w-[75px] flex-shrink-0 text-xs">
                Tên gọi khác:
              </span>
              <span className="text-zinc-300 font-normal leading-relaxed text-xs">
                {uniqueAltNames.slice(0, 3).join(" • ")}
                {uniqueAltNames.length > 3 && (
                  <span className="text-zinc-500 text-[11px] ml-1.5 font-normal">
                    (+{uniqueAltNames.length - 3} tên khác)
                  </span>
                )}
              </span>
            </div>
          )}

          {/* THỜI GIAN CẬP NHẬT GẦN NHẤT */}
          {formattedModified && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <Clock className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
              <span>Cập nhật gần nhất: {formattedModified}</span>
            </div>
          )}

          {/* DIỄN VIÊN & VAI DIỄN */}
          {castSlot && (
            <div className="pt-3 border-t border-white/[0.04]">{castSlot}</div>
          )}
        </div>
      )}
    </div>
  );
}

