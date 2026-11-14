"use client";

import React, { useState } from "react";
import { CheckCircle2, Film, Loader2, AlertCircle, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { BaseModal } from "@/components/ui/BaseModal";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  customTitle?: string;
  customSubtitle?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  customTitle,
  customSubtitle,
}) => {
  const { user, isConfigured, signInWithGoogle, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      className="p-6 sm:p-8 space-y-6"
      bodyClassName="p-0 overflow-visible"
    >
      {user ? (
        /* TRẠNG THÁI ĐÃ ĐĂNG NHẬP */
        <div className="text-center space-y-5 py-2">
          <UserAvatar
            src={user.photoURL || undefined}
            name={user.displayName || user.email}
            seed={user.uid || user.displayName || user.email}
            sizeClassName="w-20 h-20 text-2xl font-black"
            className="mx-auto shadow-xl"
          />

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
              <CheckCircle2 size={13} />
              <span>Cloud Synced</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              {user.displayName || "Nanaflix User"}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">{user.email}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-netflix-red hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-black/50"
            >
              Tiếp tục xem phim
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      ) : (
        /* TRẠNG THÁI CHƯA ĐĂNG NHẬP */
        <div className="space-y-6">
          <div className="text-center space-y-2 pt-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-netflix-red/12 text-netflix-red mb-1">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              {customTitle || "Đăng nhập Nanaflix"}
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              {customSubtitle ||
                "Đăng nhập để đồng bộ lịch sử xem phim và danh sách yêu thích trên mọi thiết bị."}
            </p>
          </div>

          {/* BÁO LỖI NẾU CÓ */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!isConfigured && (
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-300 text-xs text-center">
              Firebase chưa được cấu hình. Vui lòng kiểm tra file .env.local
            </div>
          )}

          {/* NÚT GOOGLE SIGN IN */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || !isConfigured}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 font-bold text-sm transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-zinc-800" />
                <span>Google...</span>
              </>
            ) : (
              <>
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
                <span>Đăng nhập với Google</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-zinc-500 leading-relaxed">
            Bằng việc đăng nhập, bạn đồng ý với Điều khoản dịch vụ và Chính sách riêng tư của Nanaflix.
          </p>
        </div>
      )}
    </BaseModal>
  );
};
