import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveNextResumeEpisode } from "@/lib/seriesResume";
import { EpisodeItem } from "@/components/cinema/WatchController";
import { EpisodeProgressData, WatchHistoryItem } from "@/lib/watchHistory";

describe("Series Watch History & Resume Episode Suite", () => {
  const dummyEpisodes: EpisodeItem[] = [
    { name: "Tập 1", slug: "tap-01" },
    { name: "Tập 2", slug: "tap-02" },
    { name: "Tập 3", slug: "tap-03" },
    { name: "Tập 4", slug: "tap-04" },
    { name: "Tập 5", slug: "tap-05" },
  ];

  const movieSlug = "breaking-bad";

  it("Kịch bản 1: Xem tập 1 đến 40% (240s / 600s), thoát ra, mở lại -> Tiếp tục tập 1 tại 40%", () => {
    const episodesProgress: Record<string, EpisodeProgressData> = {
      "tap-01": {
        progressSeconds: 240,
        durationSeconds: 600,
        updatedAt: 1000,
        isCompleted: false,
      },
    };

    const result = resolveNextResumeEpisode(movieSlug, dummyEpisodes, {
      episodesProgress,
      watchedEpisodes: [],
      watchHistory: [],
    });

    assert.ok(result);
    assert.equal(result.caseType, "in_progress");
    assert.equal(result.episode.slug, "tap-01");
    assert.equal(result.progressSeconds, 240);
    assert.equal(result.progressPercent, 40);
    assert.equal(result.buttonText, "Tiếp tục xem");
  });

  it("Kịch bản 2: Xem hết tập 1 (550s / 600s >= 90%) -> Đề xuất tập 2 từ 0s", () => {
    const episodesProgress: Record<string, EpisodeProgressData> = {
      "tap-01": {
        progressSeconds: 550,
        durationSeconds: 600,
        updatedAt: 1000,
        isCompleted: true,
      },
    };

    const result = resolveNextResumeEpisode(movieSlug, dummyEpisodes, {
      episodesProgress,
      watchedEpisodes: ["tap-01"],
      watchHistory: [],
    });

    assert.ok(result);
    assert.equal(result.caseType, "next_episode");
    assert.equal(result.episode.slug, "tap-02");
    assert.equal(result.progressSeconds, 0);
    assert.equal(result.buttonText, "Xem tập tiếp theo");
  });

  it("Kịch bản 3: Xem tập 2 đến 60% (360s / 600s) sau khi đã xem hết tập 1 -> Ưu tiên tiếp tục tập 2 tại 60%, KHÔNG quay về tập 1", () => {
    const episodesProgress: Record<string, EpisodeProgressData> = {
      "tap-01": {
        progressSeconds: 600,
        durationSeconds: 600,
        updatedAt: 1000,
        isCompleted: true,
      },
      "tap-02": {
        progressSeconds: 360,
        durationSeconds: 600,
        updatedAt: 2000,
        isCompleted: false,
      },
    };

    const result = resolveNextResumeEpisode(movieSlug, dummyEpisodes, {
      episodesProgress,
      watchedEpisodes: ["tap-01"],
      watchHistory: [],
    });

    assert.ok(result);
    assert.equal(result.caseType, "in_progress");
    assert.equal(result.episode.slug, "tap-02");
    assert.equal(result.progressSeconds, 360);
    assert.equal(result.progressPercent, 60);
    assert.equal(result.buttonText, "Tiếp tục xem");
  });

  it("Kịch bản 4: Chuyển sang mùa 2 (mảng episodes khác) -> Lịch sử mùa 2 phân lập, không nhầm với mùa 1", () => {
    const season2Episodes: EpisodeItem[] = [
      { name: "Mùa 2 Tập 1", slug: "s2-tap-01" },
      { name: "Mùa 2 Tập 2", slug: "s2-tap-02" },
    ];

    const episodesProgress: Record<string, EpisodeProgressData> = {
      "tap-01": {
        progressSeconds: 600,
        durationSeconds: 600,
        updatedAt: 1000,
        isCompleted: true,
      },
      "s2-tap-01": {
        progressSeconds: 150,
        durationSeconds: 600,
        updatedAt: 3000,
        isCompleted: false,
      },
    };

    const result = resolveNextResumeEpisode(movieSlug, season2Episodes, {
      episodesProgress,
      watchedEpisodes: ["tap-01"],
      watchHistory: [],
    });

    assert.ok(result);
    assert.equal(result.caseType, "in_progress");
    assert.equal(result.episode.slug, "s2-tap-01");
    assert.equal(result.progressSeconds, 150);
    assert.equal(result.progressPercent, 25);
  });

  it("Kịch bản 5: Tải lại trang (Reload) -> Khôi phục chính xác tiến trình và trạng thái", () => {
    const episodesProgress: Record<string, EpisodeProgressData> = {
      "tap-01": {
        progressSeconds: 600,
        durationSeconds: 600,
        updatedAt: 1000,
        isCompleted: true,
      },
      "tap-02": {
        progressSeconds: 600,
        durationSeconds: 600,
        updatedAt: 2000,
        isCompleted: true,
      },
      "tap-03": {
        progressSeconds: 200,
        durationSeconds: 500,
        updatedAt: 3000,
        isCompleted: false,
      },
    };

    const result = resolveNextResumeEpisode(movieSlug, dummyEpisodes, {
      episodesProgress,
      watchedEpisodes: ["tap-01", "tap-02"],
      watchHistory: [],
    });

    assert.ok(result);
    assert.equal(result.caseType, "in_progress");
    assert.equal(result.episode.slug, "tap-03");
    assert.equal(result.progressSeconds, 200);
    assert.equal(result.progressPercent, 40);
  });

  it("Kịch bản 6 & 7: Phân tách tài khoản & Đồng bộ Cloud (Cloud item không ghi đè tiến độ mới hơn)", () => {
    const oldCloudItem: WatchHistoryItem = {
      slug: movieSlug,
      title: "Breaking Bad",
      poster: "/poster.jpg",
      episodeSlug: "tap-01",
      episodeName: "Tập 1",
      progressSeconds: 100,
      durationSeconds: 600,
      updatedAt: 1000,
    };

    const localProgress: Record<string, EpisodeProgressData> = {
      "tap-01": {
        progressSeconds: 600,
        durationSeconds: 600,
        updatedAt: 1500,
        isCompleted: true,
      },
      "tap-02": {
        progressSeconds: 300,
        durationSeconds: 600,
        updatedAt: 2000,
        isCompleted: false,
      },
    };

    const result = resolveNextResumeEpisode(movieSlug, dummyEpisodes, {
      episodesProgress: localProgress,
      watchedEpisodes: ["tap-01"],
      watchHistory: [oldCloudItem],
    });

    assert.ok(result);
    assert.equal(result.caseType, "in_progress");
    assert.equal(result.episode.slug, "tap-02");
    assert.equal(result.progressSeconds, 300);
  });

  it("Kịch bản 8: Tập thiếu metadata (duration = undefined, name = undefined) -> Không gán nhầm trạng thái", () => {
    const rawEpisodes: EpisodeItem[] = [
      { slug: "raw-ep-1" },
      { slug: "raw-ep-2" },
    ];

    const episodesProgress: Record<string, EpisodeProgressData> = {
      "raw-ep-1": {
        progressSeconds: 45,
        updatedAt: 1000,
        isCompleted: false,
      },
    };

    const result = resolveNextResumeEpisode(movieSlug, rawEpisodes, {
      episodesProgress,
      watchedEpisodes: [],
      watchHistory: [],
    });

    assert.ok(result);
    assert.equal(result.caseType, "in_progress");
    assert.equal(result.episode.slug, "raw-ep-1");
    assert.equal(result.progressSeconds, 45);
    assert.equal(result.sourceEpisodeName, "Tập 1");
  });

  it("Kịch bản 9: Chưa từng xem phim này -> Bắt đầu từ tập đầu tiên có thể phát (episodes[0])", () => {
    const result = resolveNextResumeEpisode(movieSlug, dummyEpisodes, {
      episodesProgress: {},
      watchedEpisodes: [],
      watchHistory: [],
    });

    assert.ok(result);
    assert.equal(result.caseType, "not_started");
    assert.equal(result.episode.slug, "tap-01");
    assert.equal(result.progressSeconds, 0);
    assert.equal(result.buttonText, "Bắt đầu xem");
  });

  it("Kịch bản 10: Đã xem hết tất cả các tập (tap 1 đến 5 đều hoàn tất) -> Dừng ở tập cuối / Cho phép xem lại, không văng lỗi", () => {
    const episodesProgress: Record<string, EpisodeProgressData> = {
      "tap-01": { progressSeconds: 600, durationSeconds: 600, updatedAt: 100, isCompleted: true },
      "tap-02": { progressSeconds: 600, durationSeconds: 600, updatedAt: 200, isCompleted: true },
      "tap-03": { progressSeconds: 600, durationSeconds: 600, updatedAt: 300, isCompleted: true },
      "tap-04": { progressSeconds: 600, durationSeconds: 600, updatedAt: 400, isCompleted: true },
      "tap-05": { progressSeconds: 600, durationSeconds: 600, updatedAt: 500, isCompleted: true },
    };

    const result = resolveNextResumeEpisode(movieSlug, dummyEpisodes, {
      episodesProgress,
      watchedEpisodes: ["tap-01", "tap-02", "tap-03", "tap-04", "tap-05"],
      watchHistory: [],
    });

    assert.ok(result);
    assert.equal(result.caseType, "all_completed");
    assert.equal(result.episode.slug, "tap-05");
    assert.equal(result.buttonText, "Xem lại từ đầu");
    assert.equal(result.badgeLabel, "Đã xem hết trọn bộ");
  });
});
