import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveNextResumeEpisode } from "@/lib/seriesResume";
import { EpisodeItem } from "@/components/cinema/WatchController";
import {
  setWatchHistoryFromSync,
  getMovieEpisodesProgress,
  saveEpisodeProgress,
  clearLocalWatchHistoryOnly,
  WatchHistoryItem,
} from "@/lib/watchHistory";
import { isEpisodeWatched, getWatchedEpisodes, extractEpisodeNumber, markEpisodeAsWatched } from "@/lib/episodeTracker";

// Thiết lập mock localStorage & window cho môi trường node:test
const mockStorage: Record<string, string> = {};
const mockListeners: Record<string, Array<(...args: unknown[]) => void>> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = {
  addEventListener: (event: string, cb: (...args: unknown[]) => void) => {
    if (!mockListeners[event]) mockListeners[event] = [];
    mockListeners[event].push(cb);
  },
  removeEventListener: (event: string, cb: (...args: unknown[]) => void) => {
    if (mockListeners[event]) {
      mockListeners[event] = mockListeners[event].filter((f) => f !== cb);
    }
  },
  dispatchEvent: (event: { type?: string }) => {
    const type = event.type || "custom";
    if (mockListeners[type]) {
      mockListeners[type].forEach((cb) => cb(event));
    }
    return true;
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).CustomEvent = class CustomEvent {
  type: string;
  detail: unknown;
  constructor(type: string, params?: { detail?: unknown }) {
    this.type = type;
    this.detail = params?.detail;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = String(val);
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
  get length() {
    return Object.keys(mockStorage).length;
  },
  key: (i: number) => Object.keys(mockStorage)[i] || null,
};

describe("FINAL REGRESSION CHECK: Series Watch History & Resume Episode", () => {
  const dummyEpisodes: EpisodeItem[] = [
    { name: "Tập 1", slug: "tap-01" },
    { name: "Tập 2", slug: "tap-02" },
    { name: "Tập 3", slug: "tap-03" },
    { name: "Tập 4", slug: "tap-04" },
  ];
  const movieSlug = "regression-test-series";

  // =========================================================================
  // ĐIỂM 1: CLOUD SYNC & PHÂN LẬP THIẾT BỊ / TÀI KHOẢN
  // =========================================================================
  describe("1. Cloud Sync: Đồng bộ thiết bị khác & không bị local cũ ghi đè", () => {
    it("1.1 Thiết bị B nhận dữ liệu Cloud mới hơn -> Cập nhật đúng tập & tiến độ mới nhất", () => {
      // Giả lập Thiết bị B có dữ liệu local cũ từ hôm qua (tap-01 lúc updatedAt = 1000)
      saveEpisodeProgress(movieSlug, "tap-01", 120, 600);
      mockStorage["nanaflix_episodes_progress"] = JSON.stringify({
        [movieSlug]: {
          "tap-01": { progressSeconds: 120, durationSeconds: 600, updatedAt: 1000, isCompleted: false },
        },
      });

      // Người dùng đã xem tập 2 trên Thiết bị A lúc 11:00 (updatedAt = 5000, 350s / 600s)
      const cloudItemFromDeviceA: WatchHistoryItem = {
        slug: movieSlug,
        title: "Test Series",
        poster: "/poster.jpg",
        episodeSlug: "tap-02",
        episodeName: "Tập 2",
        progressSeconds: 350,
        durationSeconds: 600,
        updatedAt: 5000,
      };

      // Thiết bị B gọi sync từ Cloud
      setWatchHistoryFromSync([cloudItemFromDeviceA]);

      // Kiểm tra Thiết bị B phân giải resume
      const result = resolveNextResumeEpisode(movieSlug, dummyEpisodes);
      assert.ok(result, "Phải phân giải được tập resume");
      assert.equal(result.caseType, "in_progress");
      assert.equal(result.episode.slug, "tap-02", "Phải ưu tiên tập 2 từ Cloud mới hơn");
      assert.equal(result.progressSeconds, 350, "Tiến độ phải là 350s từ Cloud");
    });

    it("1.2 Local cũ hơn không được ghi đè Cloud item mới hơn", () => {
      // Cloud có timestamp = 10000
      const cloudItem: WatchHistoryItem = {
        slug: movieSlug,
        title: "Test Series",
        poster: "/poster.jpg",
        episodeSlug: "tap-03",
        episodeName: "Tập 3",
        progressSeconds: 450,
        durationSeconds: 600,
        updatedAt: 10000,
      };
      setWatchHistoryFromSync([cloudItem]);

      // Giả lập tiến trình local cũ hơn (updatedAt = 2000)
      const resolved = resolveNextResumeEpisode(movieSlug, dummyEpisodes, {
        watchHistory: [cloudItem],
        episodesProgress: {
          "tap-01": { progressSeconds: 200, durationSeconds: 600, updatedAt: 2000, isCompleted: false },
        },
        watchedEpisodes: [],
      });

      assert.equal(resolved?.episode.slug, "tap-03", "Tiến trình Cloud mới hơn phải được bảo toàn");
      assert.equal(resolved?.progressSeconds, 450);
    });

    it("1.3 Đăng xuất dọn sạch local storage, không để lại vết cho tài khoản mới", () => {
      clearLocalWatchHistoryOnly();
      assert.equal(mockStorage["nanaflix_watch_history"], undefined);
      assert.equal(mockStorage["nanaflix_episodes_progress"], undefined);
      assert.equal(mockStorage[`nanaflix_watched_eps_${movieSlug}`], undefined);
    });
  });

  // =========================================================================
  // ĐIỂM 2: PLAYBACK PERSISTENCE
  // =========================================================================
  describe("2. Playback Persistence: Lưu tiến độ độc lập, không phụ thuộc riêng beforeunload", () => {
    it("2.1 Lưu đồng bộ vào localStorage ngay khi gọi, hoạt động hoàn hảo khi offline", () => {
      saveEpisodeProgress(movieSlug, "tap-02", 210, 600, {
        episodeName: "Tập 2",
        isCompleted: false,
      });

      const prog = getMovieEpisodesProgress(movieSlug);
      assert.equal(prog["tap-02"]?.progressSeconds, 210);
      assert.equal(prog["tap-02"]?.durationSeconds, 600);
      assert.equal(prog["tap-02"]?.isCompleted, false);
    });

    it("2.2 Phục hồi chính xác sau khi reload hoặc đóng trang", () => {
      const prog = getMovieEpisodesProgress(movieSlug);
      assert.ok(prog["tap-02"]);
      assert.equal(prog["tap-02"].progressSeconds, 210);
    });
  });

  // =========================================================================
  // ĐIỂM 3: COMPLETION & BẢO VỆ NGƯỠNG 90%
  // =========================================================================
  describe("3. Completion: Ngưỡng 90%, tua video, chuyển tập sớm & duration không hợp lệ", () => {
    it("3.1 Dưới ngưỡng 90% (89.9% = 539s / 600s) -> KHÔNG đánh dấu đã xem", () => {
      saveEpisodeProgress(movieSlug, "tap-01", 539, 600);

      const prog = getMovieEpisodesProgress(movieSlug);
      assert.equal(prog["tap-01"].isCompleted, false, "89.9% không được đánh dấu là completed");
      assert.equal(isEpisodeWatched(movieSlug, "tap-01"), false, "Không có trong danh sách đã xem");
    });

    it("3.2 Đạt hoặc vượt ngưỡng 90% (90.0% = 540s / 600s) -> TỰ ĐỘNG đánh dấu đã xem", () => {
      saveEpisodeProgress(movieSlug, "tap-01", 540, 600);

      const prog = getMovieEpisodesProgress(movieSlug);
      assert.equal(prog["tap-01"].isCompleted, true, "90.0% phải được đánh dấu là completed");
      assert.equal(isEpisodeWatched(movieSlug, "tap-01"), true, "Phải có trong danh sách đã xem");
    });

    it("3.3 Chuyển tập sớm (xem 30s / 1200s rồi chuyển tập) -> KHÔNG đánh dấu đã xem, lưu là xem dở", () => {
      saveEpisodeProgress(movieSlug, "tap-03", 30, 1200);

      const prog = getMovieEpisodesProgress(movieSlug);
      assert.equal(prog["tap-03"].isCompleted, false);
      assert.equal(prog["tap-03"].progressSeconds, 30);
      assert.equal(isEpisodeWatched(movieSlug, "tap-03"), false);

      const resolved = resolveNextResumeEpisode(movieSlug, dummyEpisodes, {
        episodesProgress: prog,
        watchedEpisodes: getWatchedEpisodes(movieSlug),
        watchHistory: [],
      });
      assert.equal(resolved?.caseType, "in_progress");
      assert.equal(resolved?.episode.slug, "tap-03");
      assert.equal(resolved?.progressSeconds, 30);
    });

    it("3.4 Duration không hợp lệ (duration = 0, undefined, NaN, -1) -> TUYỆT ĐỐI KHÔNG đánh dấu đã xem sai", () => {
      // Test duration = 0
      saveEpisodeProgress(movieSlug, "tap-04", 50, 0);
      assert.equal(getMovieEpisodesProgress(movieSlug)["tap-04"].isCompleted, false);
      assert.equal(isEpisodeWatched(movieSlug, "tap-04"), false);

      // Test duration = undefined
      saveEpisodeProgress(movieSlug, "tap-04", 50, undefined);
      assert.equal(getMovieEpisodesProgress(movieSlug)["tap-04"].isCompleted, false);
      assert.equal(isEpisodeWatched(movieSlug, "tap-04"), false);

      // Test duration = NaN
      saveEpisodeProgress(movieSlug, "tap-04", 50, NaN);
      assert.equal(getMovieEpisodesProgress(movieSlug)["tap-04"].isCompleted, false);
      assert.equal(isEpisodeWatched(movieSlug, "tap-04"), false);

      // Test duration = -10
      saveEpisodeProgress(movieSlug, "tap-04", 50, -10);
      assert.equal(getMovieEpisodesProgress(movieSlug)["tap-04"].isCompleted, false);
      assert.equal(isEpisodeWatched(movieSlug, "tap-04"), false);
    });
  });

  // =========================================================================
  // ĐIỂM 4: CHUẨN HOÁ SỐ TẬP & DẤU TÍCH ĐÃ XEM LIÊN SERVER (CROSS-SERVER)
  // =========================================================================
  describe("4. Episode Normalization & Cross-Server Watched Checkmarks", () => {
    it("4.1 extractEpisodeNumber bóc tách chính xác số tập từ nhiều định dạng", () => {
      assert.equal(extractEpisodeNumber("tap-01"), 1);
      assert.equal(extractEpisodeNumber("tap-1"), 1);
      assert.equal(extractEpisodeNumber("tap-051"), 51);
      assert.equal(extractEpisodeNumber("tap-51"), 51);
      assert.equal(extractEpisodeNumber("Tập 51"), 51);
      assert.equal(extractEpisodeNumber("51"), 51);
      assert.equal(extractEpisodeNumber("ep-62"), 62);
      assert.equal(extractEpisodeNumber("tap-51-52"), 51);
      assert.equal(extractEpisodeNumber("Full"), null);
      assert.equal(extractEpisodeNumber("Trailer"), null);
      assert.equal(extractEpisodeNumber("Bản Full"), null);
    });

    it("4.2 isEpisodeWatched hỗ trợ đối chiếu khác biệt slug giữa các server (vd: tap-01 vs tap-1)", () => {
      const crossMovie = "cross-server-movie";
      // Đánh dấu tập đã xem với slug của Server A (tap-01)
      markEpisodeAsWatched(crossMovie, "tap-01");

      // Server B dùng slug 'tap-1' -> Vẫn phải nhận diện là đã xem
      assert.equal(isEpisodeWatched(crossMovie, "tap-1"), true, "tap-1 phải khớp với tap-01 đã lưu");
      // Server C dùng tên 'Tập 1' -> Vẫn phải nhận diện là đã xem
      assert.equal(isEpisodeWatched(crossMovie, "other-slug", "Tập 1"), true, "Tập 1 phải khớp với tap-01");
      // Tập khác (tap-2) chưa xem -> false
      assert.equal(isEpisodeWatched(crossMovie, "tap-2"), false);
    });

    it("4.3 seriesResume nhận diện tập hoàn tất ngay cả khi slug giữa các server lệch định dạng", () => {
      const crossMovie2 = "cross-resume-movie";
      const episodesServerB: EpisodeItem[] = [
        { name: "Tập 1", slug: "tap-1" },
        { name: "Tập 2", slug: "tap-2" },
      ];

      // Đã xem tập 1 với slug tap-01 (server A)
      const res = resolveNextResumeEpisode(crossMovie2, episodesServerB, {
        watchedEpisodes: ["tap-01"],
        episodesProgress: {},
        watchHistory: [],
      });

      // Phải gợi ý tập kế tiếp là tập 2 (tap-2)
      assert.ok(res);
      assert.equal(res.caseType, "next_episode");
      assert.equal(res.episode.slug, "tap-2");
    });
  });
});
