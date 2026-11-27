"use client";

import React from "react";
import {
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
      <form onSubmit={handleSavePlayerSettings} className="space-y-5">
        <div className="pb-3 border-b border-white/[0.08] space-y-1">
          <h4 className="text-sm sm:text-base font-bold text-white">
            Cài đặt trình phát
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Tùy chọn được lưu tự động và đồng bộ trên mọi thiết bị của bạn.
          </p>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {/* TỰ ĐỘNG CHUYỂN TẬP */}
          <div className="flex items-center justify-between py-3.5 gap-4">
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">
                Tự động phát tập tiếp theo
              </div>
              <p className="text-xs text-zinc-400 leading-normal">
                Tự động chuyển sang tập kế tiếp khi xem xong một tập phim bộ.
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
          <div className="flex items-center justify-between py-3.5 gap-4">
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">
                Mặc định mở chế độ Rạp phim
              </div>
              <p className="text-xs text-zinc-400 leading-normal">
                Mở rộng khung phát video theo chiều ngang khi bắt đầu xem.
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
          <div className="flex items-center justify-between py-3.5 gap-4">
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">
                Mặc định làm tối xung quanh
              </div>
              <p className="text-xs text-zinc-400 leading-normal">
                Làm tối vùng xung quanh trình phát để tập trung hơn.
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
          <div className="flex items-center justify-between py-3.5 gap-4">
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">
                Tự động bật phụ đề
              </div>
              <p className="text-xs text-zinc-400 leading-normal">
                Ưu tiên hiển thị phụ đề Tiếng Việt khi video có sẵn track phụ đề.
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
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-semibold text-white">
                  Tốc độ phát mặc định
                </h5>
                <p className="text-xs text-zinc-400">Tốc độ bắt đầu khi mở video</p>
              </div>
              <span className="text-sm font-bold text-white tabular-nums">
                {playerSettings.playbackSpeed}x
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() =>
                    setPlayerSettingsState({ ...playerSettings, playbackSpeed: speed })
                  }
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition cursor-pointer text-center tabular-nums ${
                    playerSettings.playbackSpeed === speed
                      ? "bg-netflix-red text-white shadow-sm"
                      : "bg-white/[0.06] text-zinc-300 hover:bg-white/10 hover:text-white"
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
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setPlayerSettingsState(getPlayerSettings(userId))}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
          <button
            type="submit"
            disabled={isSavingPlayerSettings}
            className="px-5 py-2 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isSavingPlayerSettings ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu cài đặt</span>
              </>
            )}
          </button>
        </div>
      </form>
    );
  }
);

