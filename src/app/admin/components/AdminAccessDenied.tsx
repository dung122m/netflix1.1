"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, RefreshCw, Lock, Home } from "lucide-react";
import { AuthModal } from "@/components/modals/AuthModal";

interface AdminAccessDeniedProps {
  userEmail?: string | null;
  hasUser: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
}

export function AdminAccessDenied({
  userEmail,
  hasUser,
  showAuthModal,
  setShowAuthModal,
}: AdminAccessDeniedProps) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full p-5 sm:p-8 rounded-3xl bg-white/[0.03] shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-5 shadow-md shadow-black/50">
          <Lock size={32} />
        </div>

        <h1 className="text-xl font-bold text-white mb-2">Khu Vực Quản Trị Viên (Admin)</h1>
        <p className="text-xs text-zinc-400 leading-relaxed mb-6">
          Trang này chỉ dành riêng cho Quản Trị Viên hệ thống Nanaflix. Tài khoản của bạn hiện tại chưa được cấp quyền truy cập vào trung tâm dữ liệu này.
        </p>

        <div className="p-3.5 rounded-2xl bg-black/60 mb-6 text-left space-y-1.5">
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Tài khoản hiện tại:</span>
            <span className="text-white font-semibold truncate max-w-[200px]">
              {hasUser ? userEmail : "Chưa đăng nhập"}
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Trạng thái:</span>
            <span className="text-red-400 font-semibold">Không có quyền truy cập</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {!hasUser ? (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="w-full py-3 px-4 rounded-xl bg-netflix-red hover:bg-netflix-red-hover text-white font-bold text-xs shadow-md shadow-black/50 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} />
              <span>Đăng nhập tài khoản Admin</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              <span>Đổi tài khoản khác</span>
            </button>
          )}

          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            <Home size={14} />
            <span>Quay về Trang Chủ Nanaflix</span>
          </Link>
        </div>
      </div>

      {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

