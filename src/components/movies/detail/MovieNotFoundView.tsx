import Link from "next/link";
import { Film, Home, Compass, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export function MovieNotFoundView() {
  return (
    <div className="min-h-dvh bg-black text-white flex flex-col justify-between selection:bg-netflix-red selection:text-white">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Glow Icon */}
          <div className="relative mx-auto w-20 h-20 rounded-3xl bg-netflix-red/10 flex items-center justify-center text-rose-500 shadow-xl shadow-black/80">
            <div className="absolute inset-0 bg-rose-500/20 rounded-3xl blur-xl" />
            <Film className="w-10 h-10 relative z-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-xs font-bold text-zinc-400">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Không tìm thấy phim</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Nội dung tạm thời chưa khả dụng
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
              Bộ phim bạn đang tìm kiếm có thể đã được đổi tên hoặc đang trong quá trình cập nhật nguồn phát mới.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-rose-700 text-white font-bold text-xs transition shadow-md shadow-black/50 active:scale-95 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Về Trang Chủ</span>
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Khám Phá Phim Mới</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

