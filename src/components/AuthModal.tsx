"use client";

import React, { useState } from "react";
import { X, CheckCircle2, ShieldCheck, Smartphone, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  customTitle?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, customTitle }) => {
  const { user, isConfigured, signInWithGoogle, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.success) {
      onClose();
    } else if (result.error) {
      setErrorMessage(result.error);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-zinc-950/95 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-5 animate-in zoom-in-95 duration-200"
      >
        {/* Glow hiệu ứng nền đỏ Netflix */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-netflix-red/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer z-10"
        >
          <X size={18} />
        </button>

        {user ? (
          /* TRẠNG THÁI ĐÃ ĐĂNG NHẬP */
          <div className="text-center space-y-5 py-2">
            <div className="relative mx-auto w-20 h-20 rounded-full ring-4 ring-netflix-red/40 overflow-hidden shadow-xl bg-zinc-800 flex items-center justify-center">
              <span className="text-2xl font-bold text-white uppercase">
                {(user.displayName || user.email || "U")[0]}
              </span>
              {user.photoURL && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Avatar"}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                <CheckCircle2 size={13} />
                <span>Đã kết nối tài khoản Google</span>
              </div>
              <h3 className="text-xl font-bold text-white">
                {user.displayName || "Thành viên Nanaflix"}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-left space-y-2 text-xs text-gray-300">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Sparkles size={14} />
                <span>Đồng bộ Đám mây đang hoạt động</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Tiến trình xem, số phút và tập phim dở dang của bạn đang được tự động lưu lên đám mây. Bạn có thể mở Nanaflix trên bất kỳ thiết bị nào để tiếp tục xem ngay lập tức!
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
              >
                Tiếp tục xem
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  onClose();
                }}
                className="py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        ) : (
          /* TRẠNG THÁI CHƯA ĐĂNG NHẬP */
          <div className="space-y-5">
            <div className="text-center space-y-1.5 pt-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-netflix-red/15 text-netflix-red border border-netflix-red/30 mb-2 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {customTitle || "Đăng Nhập Nanaflix"}
              </h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Đồng bộ số phút đang xem và lưu trữ danh sách phim yêu thích trên mọi thiết bị
              </p>
            </div>

            {/* DANH SÁCH LỢI ÍCH */}
            <div className="space-y-2.5 bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-xs text-gray-300">
              <div className="flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">
                  <strong className="text-white">Xem tiếp đúng phút:</strong> Chuyển đổi mượt mà giữa máy tính, điện thoại, máy tính bảng.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">
                  <strong className="text-white">Không lo mất dữ liệu:</strong> Lịch sử xem được lưu an toàn trên đám mây Google.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">
                  <strong className="text-white">100% Miễn phí trọn đời:</strong> Xác thực an toàn chỉ với 1 chạm qua tài khoản Google.
                </span>
              </div>
            </div>

            {/* BÁO LỖI NẾU CÓ */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* HƯỚNG DẪN NẾU CHƯA CẤU HÌNH ENV FIREBASE */}
            {!isConfigured && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertCircle size={15} />
                  <span>Chưa thêm khóa Firebase API</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Để bật đăng nhập Google thật, bạn chỉ cần tạo 1 dự án Firebase miễn phí và dán các biến vào file <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-white">.env.local</code> (hệ thống đã tạo sẵn file hướng dẫn mẫu <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-white">.env.example</code>).
                </p>
              </div>
            )}

            {/* NÚT ĐĂNG NHẬP GOOGLE */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-gray-100 active:scale-[0.98] text-gray-900 font-bold text-sm flex items-center justify-center gap-3 transition shadow-lg shadow-white/10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-gray-800" />
                  <span>Đang kết nối Google...</span>
                </>
              ) : (
                <>
                  {/* Google "G" Logo SVG chuẩn */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Tiếp tục với Google</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-gray-400">
              Bằng việc đăng nhập, bạn đồng ý với Điều khoản và Chính sách của Nanaflix.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
