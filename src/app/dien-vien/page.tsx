import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users, Film, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getAllCatalogActors } from "@/data/actorsCatalog";
import { ActorHubClient } from "@/components/actors/ActorHubClient";

export const metadata: Metadata = {
  title: "Diễn Viên & Nghệ Sĩ Điện Ảnh Nổi Tiếng | Nanaflix",
  description:
    "Khám phá hồ sơ, tiểu sử và trọn bộ danh sách phim của các diễn viên, ngôi sao điện ảnh nổi tiếng Việt Nam, Hàn Quốc, Trung Quốc, Hồng Kông, Hollywood tại Nanaflix.",
  keywords: [
    "dien vien",
    "nghe si dien anh",
    "dien vien han quoc",
    "dien vien viet nam",
    "sao hollywood",
    "chau tinh tri",
    "tran thanh",
    "phim theo dien vien",
    "nanaflix",
  ],
};

export default function ActorsHubPage() {
  const allActors = getAllCatalogActors();

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-hidden">
      <Navbar />

      {/* AMBIENT GLOW */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(229,9,20,0.1),rgba(0,0,0,0))] pointer-events-none -z-10" />

      <main className="flex-1 pt-24 sm:pt-28 pb-24 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto w-full space-y-10 sm:space-y-14">
        
        {/* ============================================================ */}
        {/* HERO / HEADER SECTION */}
        {/* ============================================================ */}
        <section className="space-y-4 text-center max-w-3xl mx-auto pt-2 sm:pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.08] px-3.5 py-1.5 rounded-full border border-white/[0.08] mb-2 backdrop-blur-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Trang chủ</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-netflix-red text-xs font-semibold tracking-wide uppercase mx-auto block w-fit">
            <Users className="w-3.5 h-3.5" />
            <span>Thư viện nghệ sĩ • Cast Directory</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.15]">
            Khám Phá{" "}
            <span className="bg-gradient-to-r from-netflix-red via-rose-400 to-amber-400 bg-clip-text text-transparent">
              Diễn Viên & Nghệ Sĩ
            </span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-gray-400 leading-relaxed font-normal max-w-2xl mx-auto">
            Hồ sơ tiểu sử, vai diễn để đời và trọn bộ tuyển tập phim của những ngôi sao màn bạc hàng đầu Việt Nam, Châu Á và thế giới.
          </p>
        </section>

        {/* ============================================================ */}
        {/* ACTOR HUB CLIENT COMPONENT */}
        {/* ============================================================ */}
        <ActorHubClient initialActors={allActors} />

        {/* ============================================================ */}
        {/* DISCOVERY FOOTER CALLOUT */}
        {/* ============================================================ */}
        <section className="p-6 sm:p-8 rounded-3xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Tìm kiếm phim theo diễn viên chưa có trong danh mục?</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-400">
              Nhập trực tiếp tên bất kỳ diễn viên nào vào thanh tìm kiếm trên thanh điều hướng để xem toàn bộ phim tương ứng.
            </p>
          </div>

          <Link
            href="/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition border border-white/10 shrink-0 cursor-pointer"
          >
            <Film className="w-4 h-4" />
            <span>Bộ lọc phim chi tiết</span>
          </Link>
        </section>

      </main>

      <Footer />
    </div>
  );
}
