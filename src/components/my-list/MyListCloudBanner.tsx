"use client";

import React from "react";
import Link from "next/link";
import { User, RefreshCw } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface CloudBannerUser {
  uid?: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

interface MyListCloudBannerProps {
  user: CloudBannerUser | null;
  isSyncing: boolean;
  onSyncNow: () => void;
  onOpenAuth: () => void;
}

export function MyListCloudBanner({
  user,
  isSyncing,
  onSyncNow,
  onOpenAuth,
}: MyListCloudBannerProps) {
  return (
    <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      {user ? (
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <UserAvatar
            src={user.photoURL || undefined}
            name={user.displayName || user.email}
            seed={user.uid || user.displayName || user.email}
            sizeClassName="w-8 h-8 text-xs font-bold flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="truncate">Tài khoản: {user.displayName || user.email}</span>
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed break-words line-clamp-2 sm:line-clamp-1">
              Danh sách xem sau, lịch sử xem và các bộ sưu tập đã được đồng bộ.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-xs sm:text-sm font-bold text-white truncate">
            Đồng bộ dữ liệu xem phim
          </p>
          <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed break-words line-clamp-2 sm:line-clamp-1">
            Đăng nhập tài khoản Google để đồng bộ danh sách phim và xem tiếp trên mọi thiết bị.
          </p>
        </div>
      )}

      <div className="flex-shrink-0 w-full sm:w-auto">
        {user ? (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Link
              href="/profile"
              className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-full sm:rounded-xl bg-netflix-red/20 hover:bg-netflix-red/30 text-xs font-bold text-white transition cursor-pointer active:scale-95"
            >
              <User className="w-3.5 h-3.5 text-current flex-shrink-0" />
              <span>Hồ sơ & Cài đặt</span>
            </Link>

            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncNow}
              className="flex-1 sm:flex-none justify-center inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-full sm:rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-zinc-200 hover:text-white transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Đang đồng bộ..." : "Đồng bộ lại"}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-full sm:rounded-xl bg-white hover:bg-zinc-100 text-xs sm:text-sm font-bold text-zinc-950 transition cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <span>Đăng nhập Google</span>
          </button>
        )}
      </div>
    </div>
  );
}

