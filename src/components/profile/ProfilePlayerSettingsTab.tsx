"use client";

import React from "react";
import {
  Sliders,
  Play,
  Tv,
  Moon,
  Subtitles,
  Zap,
  RotateCcw,
  Save,
  Loader2,
} from "lucide-react";
import { PlayerSettings, getPlayerSettings } from "@/services/userService";

export interface ProfilePlayerSettingsTabProps {
  playerSettings: PlayerSettings;
  setPlayerSettingsState: (settings: PlayerSettings) => void;
  handleSavePlayerSettings: (e: React.FormEvent) => void;
  isSavingPlayerSettings: boolean;
  userId?: string;
}

export const ProfilePlayerSettingsTab: React.FC<ProfilePlayerSettingsTabProps> = React.memo(
  function ProfilePlayerSettingsTab({
    playerSettings,
    setPlayerSettingsState,
    handleSavePlayerSettings,
    isSavingPlayerSettings,
    userId,
  }) {
    return (
      <form onSubmit={handleSavePlayerSettings} className="space-y-6">
        <div className="p-4 rounded-2xl bg-white/[0.03] space-y-1">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-netflix-red shrink-0" />
            <span>Đồng bộ tùy chọn trình phát Cloud</span>
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Tất cả các tùy chọn xem phim dưới đây được lưu trữ trên tài khoản Supabase của bạn và tự động đồng bộ tức thì trên PC, Laptop và Điện thoại di động.
          </p>
        </div>

        <div className="space-y-3">
          {/* TỰ ĐỘNG CHUYỂN TẬP */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/80 transition gap-4">
            <div className="space-y-1 flex-1 min-w-0 pr-2">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-netflix-red shrink-0" />
                <span>Tự động phát tập tiếp theo</span>
              </div>
              <p className="text-xs text-zinc-400 leading-normal">
                Khi xem xong một tập phim bộ, CinemaPlayer sẽ tự động chuyển sang tập kế tiếp với đồng hồ đếm ngược.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={playerSettings.autoNextEpisode}
                onChange={(e) =>
                  setPlayerSettingsState({ ...playerSettings, autoNextEpisode: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-netflix-red"></div>
            </label>
          </div>

          {/* MẶC ĐỊNH MỞ RẠP PHIM */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/80 transition gap-4">
            <div className="space-y-1 flex-1 min-w-0 pr-2">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Tv className="w-4 h-4 text-zinc-300 shrink-0" />
                <span>Mặc định mở Giao diện Rạp Chiếu Phim (Theater Mode)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-normal">
                Mở rộng khung phát phim toàn chiều rộng màn hình để trải nghiệm điện ảnh chân thực và mãn nhãn.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={playerSettings.defaultTheaterMode}
                onChange={(e) =>
                  setPlayerSettingsState({ ...playerSettings, defaultTheaterMode: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-netflix-red"></div>
            </label>
          </div>

          {/* MẶC ĐỊNH TẮT ĐÈN */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/80 transition gap-4">
            <div className="space-y-1 flex-1 min-w-0 pr-2">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Moon className="w-4 h-4 text-zinc-300 shrink-0" />
                <span>Mặc định bật chế độ Tối Màn Hình (Lights Off)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-normal">
                Làm tối toàn bộ giao diện xung quanh màn hình phát để bạn tập trung trọn vẹn vào từng thước phim.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={playerSettings.defaultLightsOff}
                onChange={(e) =>
                  setPlayerSettingsState({ ...playerSettings, defaultLightsOff: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-netflix-red"></div>
            </label>
          </div>

          {/* TỰ ĐỘNG BẬT PHỤ ĐỀ */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/80 transition gap-4">
            <div className="space-y-1 flex-1 min-w-0 pr-2">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Subtitles className="w-4 h-4 text-zinc-300 shrink-0" />
                <span>Tự động hiển thị phụ đề (Auto Subtitle)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-normal">
                Tự động ưu tiên bật track phụ đề Tiếng Việt khi nguồn video có sẵn bản sub.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={playerSettings.autoSubtitle}
                onChange={(e) =>
                  setPlayerSettingsState({ ...playerSettings, autoSubtitle: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-netflix-red"></div>
            </label>
          </div>

          {/* TỐC ĐỘ PHÁT MẶC ĐỊNH */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-zinc-300 shrink-0" />
                  <span>Tốc độ phát mặc định</span>
                </h5>
                <p className="text-xs text-zinc-400">Tốc độ phát bắt đầu khi mở bất kỳ tập phim nào</p>
              </div>
              <span className="text-sm font-bold text-netflix-red tabular-nums">
                {playerSettings.playbackSpeed}x
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() =>
                    setPlayerSettingsState({ ...playerSettings, playbackSpeed: speed })
                  }
                  className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-black transition cursor-pointer text-center tabular-nums ${
                    playerSettings.playbackSpeed === speed
                      ? "bg-amber-500 text-black shadow-md shadow-black/50"
                      : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {speed === 1 ? (
                    <>
                      1.0x<span className="hidden sm:inline"> (Chuẩn)</span>
                    </>
                  ) : (
                    `${speed}x`
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setPlayerSettingsState(getPlayerSettings(userId))}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
          <button
            type="submit"
            disabled={isSavingPlayerSettings}
            className="px-6 py-2.5 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-black/50 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isSavingPlayerSettings ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu cài đặt...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu Cài Đặt Cloud</span>
              </>
            )}
          </button>
        </div>
      </form>
    );
  }
);

