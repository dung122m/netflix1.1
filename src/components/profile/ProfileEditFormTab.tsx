"use client";

import React from "react";
import { Loader2, Upload, Check, Lock, Save } from "lucide-react";
import { PRESET_AVATARS } from "@/lib/avatarHelper";
import { Tooltip } from "@/components/ui/Tooltip";
import { AVAILABLE_BADGES, GENRE_OPTIONS } from "./profileConstants";

interface ProfileEditFormTabProps {
  onSubmit: (e: React.FormEvent) => void;
  isUploadingAvatar: boolean;
  onTriggerAvatarUpload: () => void;
  useCustomUrl: boolean;
  setUseCustomUrl: (val: boolean) => void;
  selectedAvatar: string;
  setSelectedAvatar: (url: string) => void;
  customAvatarUrl: string;
  uploadedAvatars?: string[];
  onSelectUploadedAvatar?: (url: string) => void;
  onRemoveUploadedAvatar?: (url: string) => void;
  displayName: string;
  setDisplayName: (val: string) => void;
  bio: string;
  setBio: (val: string) => void;
  watchMins: number;
  userBadges: string[];
  badgeHint: string | null;
  toggleBadge: (badge: (typeof AVAILABLE_BADGES)[number]) => void;
  favoriteGenres: string[];
  toggleGenre: (genre: string) => void;
  isSavingProfile: boolean;
}

export function ProfileEditFormTab({
  onSubmit,
  isUploadingAvatar,
  onTriggerAvatarUpload,
  useCustomUrl,
  setUseCustomUrl,
  selectedAvatar,
  setSelectedAvatar,
  customAvatarUrl,
  uploadedAvatars = [],
  onSelectUploadedAvatar,
  onRemoveUploadedAvatar,
  displayName,
  setDisplayName,
  bio,
  setBio,
  watchMins,
  userBadges,
  badgeHint,
  toggleBadge,
  favoriteGenres,
  toggleGenre,
  isSavingProfile,
}: ProfileEditFormTabProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* KHO AVATAR */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h3 className="text-sm font-bold text-white">
              Kho avatar & tải ảnh riêng
            </h3>
            <p className="text-xs text-zinc-400">Chọn mẫu avatar hoặc tải ảnh đại diện từ máy tính / điện thoại</p>
          </div>
          <button
            type="button"
            disabled={isUploadingAvatar}
            onClick={onTriggerAvatarUpload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isUploadingAvatar ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-netflix-red" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-netflix-red" />
            )}
            <span>{isUploadingAvatar ? "Đang tải..." : "Tải ảnh từ máy"}</span>
          </button>
        </div>

        {/* Robot Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2 sm:gap-2.5">
          {PRESET_AVATARS.map((item) => {
            const isSelected = !useCustomUrl && selectedAvatar === item.url;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedAvatar(item.url);
                  setUseCustomUrl(false);
                }}
                className={`relative aspect-square rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer hover:scale-105 ${
                  isSelected
                    ? "ring-2 ring-netflix-red scale-105 shadow-lg"
                    : "bg-zinc-900 hover:brightness-110"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.id} className="w-full h-full object-cover" />
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-netflix-red text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Avatar Active Banner (No raw URL) */}
        {useCustomUrl && customAvatarUrl && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={customAvatarUrl} alt="Custom Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">Ảnh tùy chỉnh đang được chọn</p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                <Check className="w-3 h-3 stroke-[3]" />
                Đang sử dụng ảnh cá nhân của bạn
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setUseCustomUrl(false);
                setSelectedAvatar(PRESET_AVATARS[0].url);
              }}
              className="text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              Dùng Avatar mẫu
            </button>
          </div>
        )}

        {/* Lịch sử ảnh đã tải lên */}
        {uploadedAvatars.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                Ảnh bạn đã tải lên ({uploadedAvatars.length})
              </span>
              <span className="text-[11px] text-zinc-500">Bấm để dùng lại</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {uploadedAvatars.map((url, idx) => {
                const isSelected = useCustomUrl && (selectedAvatar === url || customAvatarUrl === url);
                return (
                  <div key={`${url}-${idx}`} className="relative group/avatar">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectUploadedAvatar) {
                          onSelectUploadedAvatar(url);
                        } else {
                          setSelectedAvatar(url);
                          setUseCustomUrl(true);
                        }
                      }}
                      className={`relative w-12 h-12 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer hover:scale-105 ${
                        isSelected
                          ? "ring-2 ring-netflix-red scale-105 shadow-lg shadow-netflix-red/30"
                          : "bg-zinc-900 hover:brightness-110 opacity-80 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Ảnh đại diện ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-netflix-red text-white flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                    {onRemoveUploadedAvatar && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveUploadedAvatar(url);
                        }}
                        title="Xóa khỏi lịch sử"
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-red-600 transition opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-[11px] leading-none shadow cursor-pointer z-10"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* TÊN HIỂN THỊ & TIỂU SỬ */}
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300">
              Tên hiển thị
            </label>
            <span className="text-[11px] text-zinc-500 tabular-nums">{displayName.length}/40</span>
          </div>
          <input
            type="text"
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Nhập tên hiển thị trên Nanaflix..."
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-netflix-red transition font-semibold"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300">
              Tiểu sử (Slogan)
            </label>
            <span className="text-[11px] text-zinc-500 tabular-nums">{bio.length}/150</span>
          </div>
          <textarea
            rows={2}
            maxLength={150}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Mê phim Marvel, cày anime ban đêm..."
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-netflix-red transition resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* BỘ DANH HIỆU */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-300">
              Bộ danh hiệu
            </h3>
            <p className="text-xs text-zinc-400">Tích lũy giờ cày phim để mở khóa danh hiệu độc quyền</p>
          </div>
          <span className="text-xs text-amber-400 font-black tabular-nums">
            Đã mở: {AVAILABLE_BADGES.filter((b) => watchMins >= b.minMinutesReq).length}/{AVAILABLE_BADGES.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {AVAILABLE_BADGES.map((b) => {
            const isUnlocked = watchMins >= b.minMinutesReq;
            const active = isUnlocked && userBadges.includes(b.label);

            return (
              <Tooltip key={b.id} content={isUnlocked ? b.label : `Đang khóa - Cần ${b.reqText}`} side="top">
                <button
                  type="button"
                  onClick={() => toggleBadge(b)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    !isUnlocked
                      ? "bg-zinc-900/40 text-zinc-500 opacity-55 hover:opacity-80"
                      : active
                      ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50 shadow-md shadow-black/50"
                      : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {!isUnlocked && <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
                  <span>{b.label}</span>
                  {active && <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {badgeHint && (
          <div className="p-3 rounded-xl bg-amber-500/10 text-xs text-amber-300 font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{badgeHint}</span>
          </div>
        )}
      </div>

      {/* THỂ LOẠI YÊU THÍCH */}
      <div className="space-y-2.5 pt-2">
        <div>
          <h3 className="text-xs font-semibold text-zinc-300">
            Thể loại phim yêu thích (Tối đa 5)
          </h3>
          <p className="text-xs text-zinc-400">Giúp gợi ý chính xác gu phim dành riêng cho bạn</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {GENRE_OPTIONS.map((genre) => {
            const active = favoriteGenres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-netflix-red text-white shadow-md shadow-black/40"
                    : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end">
        <button
          type="submit"
          disabled={isSavingProfile}
          className="px-6 py-2.5 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-black/50 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
        >
          {isSavingProfile ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang lưu hồ sơ...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Lưu Hồ Sơ</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

