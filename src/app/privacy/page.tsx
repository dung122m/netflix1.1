import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  KeyRound,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  FileText,
  HelpCircle,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Chính Sách Bảo Mật & Quyền Riêng Tư | Nanaflix",
  description:
    "Cam kết bảo vệ quyền riêng tư tuyệt đối tại Nanaflix: Không quảng cáo rác, không bán dữ liệu, không lưu IP thô, bảo mật tài khoản chuẩn Firebase & Supabase RLS.",
};

const PRIVACY_PILLARS = [
  {
    icon: EyeOff,
    title: "100% Không Bán & Không Thương Mại Hóa Dữ Liệu",
    desc: "Nanaflix là dự án phi thương mại. Chúng tôi tuyệt đối không kinh doanh, cho thuê hay chia sẻ dữ liệu cá nhân hoặc thói quen xem phim của bạn cho bất kỳ bên thứ ba hay mạng lưới quảng cáo nào.",
    badge: "Minh bạch tuyệt đối",
    accent: "from-rose-500/20 to-red-500/5",
    borderColor: "border-red-500/20 hover:border-red-500/40",
    iconColor: "text-red-400",
  },
  {
    icon: Lock,
    title: "Không Lưu Trữ Địa Chỉ IP Thô (Raw IP)",
    desc: "Để bảo vệ quyền riêng tư, Nanaflix không lưu trữ địa chỉ IP thực của bạn trong cơ sở dữ liệu. Mọi phân tích chỉ lấy thông tin vị trí xấp xỉ cấp Tỉnh/Thành phố nhằm phục vụ tối ưu hóa đường truyền CDN và thống kê ẩn danh.",
    badge: "Ẩn danh & An toàn",
    accent: "from-emerald-500/20 to-teal-500/5",
    borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
    iconColor: "text-emerald-400",
  },
  {
    icon: KeyRound,
    title: "Xác Thực Chuẩn Ngân Hàng với Firebase & RLS",
    desc: "Mật khẩu và thông tin đăng nhập của bạn được quản lý bảo mật qua Google Firebase Authentication. Dữ liệu cá nhân trong Supabase được bảo vệ bởi chính sách Row Level Security (RLS) nghiêm ngặt — chỉ chính bạn mới có quyền truy cập.",
    badge: "Mã hóa SSL/TLS",
    accent: "from-blue-500/20 to-cyan-500/5",
    borderColor: "border-blue-500/20 hover:border-blue-500/40",
    iconColor: "text-blue-400",
  },
  {
    icon: Trash2,
    title: "Toàn Quyền Kiểm Soát & Xóa Dữ Liệu",
    desc: "Bạn có toàn quyền xóa lịch sử xem phim, làm trống danh sách yêu thích, đăng xuất khỏi mọi thiết bị hoặc yêu cầu xóa vĩnh viễn tài khoản chỉ bằng một vài thao tác đơn giản trong trang cá nhân.",
    badge: "Tự chủ 100%",
    accent: "from-amber-500/20 to-yellow-500/5",
    borderColor: "border-amber-500/20 hover:border-amber-500/40",
    iconColor: "text-amber-400",
  },
];

const DATA_COLLECTION_DETAILS = [
  {
    category: "Thông tin tài khoản",
    what: "Tên hiển thị, Email, Ảnh đại diện (nếu bạn đăng nhập bằng Google/Email).",
    why: "Để tạo hồ sơ thành viên, lưu danh sách phim và cá nhân hóa trải nghiệm.",
    storage: "Google Firebase Auth & Supabase PostgreSQL (mã hóa RLS).",
  },
  {
    category: "Tiến trình & Lịch sử xem",
    what: "Tập phim và số giây bạn đang xem dở.",
    why: "Để bạn có thể tiếp tục xem liền mạch trên điện thoại hoặc máy tính mà không cần tìm lại.",
    storage: "Cơ sở dữ liệu Supabase & LocalStorage trên thiết bị của bạn.",
  },
  {
    category: "Dữ liệu cấu hình phát",
    what: "Tốc độ phát (0.75x, 1x, 1.25x...), âm lượng, kiểu hiển thị phụ đề ưa thích.",
    why: "Ghi nhớ gu tùy chỉnh của bạn cho những lần xem phim tiếp theo.",
    storage: "LocalStorage trên trình duyệt.",
  },
  {
    category: "Thống kê hiệu năng ẩn danh",
    what: "Loại thiết bị (Desktop/Mobile), trình duyệt, mã lỗi phát video nếu có.",
    why: "Giúp tác giả phát hiện server phim bị lỗi hoặc lag để kịp thời khắc phục.",
    storage: "Bộ nhớ đệm Upstash Redis phân tán (tự động dọn dẹp theo chu kỳ).",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-hidden">
      <Navbar />

      {/* AMBIENT GLOW */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(16,185,129,0.1),rgba(0,0,0,0))] pointer-events-none -z-10" />

      <main className="flex-1 pt-28 sm:pt-32 pb-24 px-4 sm:px-8 md:px-12 max-w-5xl mx-auto w-full space-y-16 sm:space-y-20">
        
        {/* ================= HEADER ================= */}
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300 backdrop-blur-xl shadow-sm">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Cam Kết Minh Bạch & An Toàn Tuyệt Đối</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Bảo Mật & <span className="text-emerald-400">Quyền Riêng Tư</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-400 font-normal leading-relaxed max-w-2xl mx-auto">
              Tại Nanaflix, chúng tôi tôn trọng trải nghiệm và sự riêng tư của bạn hơn bất kỳ điều gì khác. Dưới đây là cam kết rõ ràng, không mập mờ về cách dữ liệu được bảo vệ.
            </p>
          </div>

          <div className="text-xs text-gray-500 font-mono">
            Phiên bản hiệu lực: Tháng 09/2026 • Cập nhật lần cuối bởi Dũng Trần
          </div>
        </section>

        {/* ================= 4 CORE PILLARS ================= */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PRIVACY_PILLARS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className={`p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-zinc-950/90 to-black border ${p.borderColor} transition-all duration-300 hover:shadow-2xl space-y-4 relative overflow-hidden group`}
              >
                <div
                  className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl ${p.accent} blur-3xl pointer-events-none -z-10`}
                />

                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] ${p.iconColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <Icon size={22} />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-300 font-mono">
                    {p.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {p.title}
                </h3>

                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-normal">
                  {p.desc}
                </p>
              </div>
            );
          })}
        </section>

        {/* ================= DETAILED BREAKDOWN TABLE ================= */}
        <section className="p-6 sm:p-10 rounded-3xl bg-zinc-950/70 border border-white/[0.1] backdrop-blur-xl space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Chúng Tôi Thu Thập Những Gì & Để Làm Gì?</h2>
              <p className="text-xs text-gray-400 mt-0.5">Chỉ những thông tin thực sự cần thiết để vận hành các tính năng xem phim.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {DATA_COLLECTION_DETAILS.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-black/40 border border-white/[0.06] hover:border-white/15 transition space-y-3"
              >
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>{item.category}</span>
                </div>
                
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-gray-400 font-semibold">Dữ liệu: </span>
                    <span className="text-gray-300">{item.what}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-semibold">Mục đích: </span>
                    <span className="text-gray-300">{item.why}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-semibold">Nơi lưu trữ: </span>
                    <span className="text-emerald-400 font-mono text-[11px]">{item.storage}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= COOKIES & LOCAL STORAGE ================= */}
        <section className="p-6 sm:p-8 rounded-3xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={18} className="text-amber-400" />
            <span>Chính Sách Cookie & Lưu Trữ Cục Bộ (Local Storage)</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
            Nanaflix không sử dụng cookie theo dõi của bên thứ ba (Third-party Tracking Cookies). Trình duyệt của bạn chỉ lưu trữ các cookie kỹ thuật cần thiết để duy trì phiên đăng nhập và ghi nhớ âm lượng, phụ đề phim. Bạn có thể xóa toàn bộ dữ liệu này bất cứ lúc nào qua cài đặt trình duyệt.
          </p>
        </section>

        {/* ================= ACTIONS ================= */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-zinc-900/80 to-black border border-white/10">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-base font-bold text-white">Bạn có câu hỏi hoặc cần hỗ trợ về tài khoản?</h4>
            <p className="text-xs text-gray-400">Xem thêm trang giải đáp thắc mắc hoặc quay lại trang xem phim.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-xs font-semibold text-gray-200 transition"
            >
              <HelpCircle size={14} />
              <span>Xem Trang FAQ</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-red-700 text-xs font-bold text-white transition shadow-lg"
            >
              <ArrowLeft size={14} />
              <span>Về Trang Chủ</span>
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
