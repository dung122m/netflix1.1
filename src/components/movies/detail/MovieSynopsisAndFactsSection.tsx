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
  actorCount,
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

      {/* TÊN GỌI KHÁC (ĐÃ LỌC TRÙNG VÀ BỎ TÊN GỐC ĐÃ HIỂN THỊ) */}
      {uniqueAltNames.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span className="text-zinc-500 font-semibold text-xs flex-shrink-0">
            Tên gọi khác:
          </span>
          <span className="text-zinc-300 font-medium leading-relaxed">
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
        <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>Cập nhật gần nhất: {formattedModified}</span>
        </div>
      )}

      {/* BẢNG THÔNG TIN CHI TIẾT */}
      {(categoryList.length > 0 ||
        countryList.length > 0 ||
        directorList.length > 0 ||
        actorCount > 0 ||
        castSlot) && (
        <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-3 text-xs sm:text-sm">
          {/* THỂ LOẠI */}
          {categoryList.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-2">
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
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-zinc-200 hover:text-white text-xs transition"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* QUỐC GIA */}
          {countryList.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-2">
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
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-zinc-200 hover:text-white text-xs transition"
                  >
                    {cnt.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ĐẠO DIỄN */}
          {directorList.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-2">
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

          {/* DIỄN VIÊN & VAI DIỄN */}
          {castSlot && (
            <div className="pt-3 border-t border-white/[0.08]">{castSlot}</div>
          )}
        </div>
      )}
    </div>
  );
}

