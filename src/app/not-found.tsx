import Link from "next/link";
import { Film, Home, Compass } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-netflix-red selection:text-white">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Cinema Glow Icon */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-netflix-red/10 border border-netflix-red/30 flex items-center justify-center text-netflix-red shadow-2xl shadow-rose-950/50">
            <div className="absolute inset-0 bg-rose-500/20 rounded-3xl blur-xl" />
            <Film className="w-12 h-12 relative z-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-400">
              <span>Lỗi 404 • Không tìm thấy trang</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Đường dẫn không tồn tại
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
              Trang bạn đang truy cập có thể đã bị xóa, đổi tên hoặc tạm thời không khả dụng trên hệ thống Nanaflix.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-rose-700 text-white font-bold text-xs transition shadow-lg shadow-rose-950/60 active:scale-95 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Về Trang Chủ</span>
            </Link>
            <Link
              href="/browse"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Khám Phá Phim</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
