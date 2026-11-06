import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateEventLifecycle,
} from "./lifecycleEngine";
import {
  filterLiveMatchesSnapshot,
  FootballMatch,
  LiveFootballData,
} from "./service";
import { LiveMatchScore } from "@/services/live/football-score/types";

describe("Nanaflix Live Football — Stale Matches Fix Verification Suite", () => {
  const baseNow = new Date("2026-11-06T14:15:00Z").getTime(); // 21:15 giờ VN

  function mockScore(overrides: Partial<LiveMatchScore> & { statusText?: string }): LiveMatchScore {
    return {
      eventId: "mock-score-1",
      leagueSlug: "eng.1",
      team1Score: 0,
      team2Score: 0,
      homeScore: 0,
      awayScore: 0,
      isReversed: false,
      status: "live",
      updatedAt: new Date(baseNow).toISOString(),
      ...overrides,
    } as LiveMatchScore;
  }

  function mockMatch(overrides: Partial<FootballMatch>): FootballMatch {
    return {
      id: "match_" + Math.random().toString(36).substring(2, 9),
      time: "18:00",
      timestamp: baseNow - 60 * 60 * 1000,
      title: "Đội Nhà vs Đội Khách",
      team1: "Đội Nhà",
      team2: "Đội Khách",
      group: "Bóng Đá Trực Tiếp",
      groups: ["Bóng Đá Trực Tiếp"],
      quality: "FHD 1080p",
      servers: [
        {
          name: "Server #1",
          url: "https://stream.example.com/live/index.m3u8",
          format: "hls",
          isHls: true,
          quality: "FHD",
        },
      ],
      ...overrides,
    };
  }

  // 1. Trận bóng đá có FT
  it("Test 1: Trận bóng đá có FT -> FINISHED ngay lập tức, không phụ thuộc vào stream hay cờ upstream", () => {
    const kickoff115mAgo = baseNow - 115 * 60 * 1000;
    const scoreFT = mockScore({
      status: "finished",
      statusText: "STATUS_FULL_TIME",
      statusDetail: "FT",
      displayClock: "FT",
    });

    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff115mAgo,
      score: scoreFT,
      streamHealth: "alive", // BLV quên tắt máy phát
      sourceStatus: "live",  // Upstream M3U còn ký tự 🟢
      now: baseNow,
      sport: "football",
    });

    assert.equal(evalResult.eventStatus, "FINISHED");
    assert.equal(evalResult.displayTimeline, "finished");
    assert.equal(evalResult.isLiveInWindow, false);
    assert.equal(evalResult.statusBadge, "FT");
  });

  // 2. Trận bóng đá có hiệp phụ và penalty
  it("Test 2A: Trận bóng đá có hiệp phụ (ET 105') -> LIVE với badge ET", () => {
    const kickoff140mAgo = baseNow - 140 * 60 * 1000;
    const scoreET = mockScore({
      status: "live",
      statusText: "STATUS_OVERTIME",
      statusDetail: "ET 105'",
      displayClock: "105",
    });

    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff140mAgo,
      score: scoreET,
      streamHealth: "alive",
      now: baseNow,
      sport: "football",
    });

    assert.equal(evalResult.eventStatus, "EXTRA_TIME");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
    assert.equal(evalResult.statusBadge, "ET");
  });

  it("Test 2B: Trận bóng đá có penalty shootout (PEN) -> LIVE với badge PEN", () => {
    const kickoff165mAgo = baseNow - 165 * 60 * 1000;
    const scorePen = mockScore({
      status: "live",
      statusText: "STATUS_SHOOTOUT",
      statusDetail: "Penalties (4-3)",
      displayClock: "PEN",
    });

    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff165mAgo,
      score: scorePen,
      streamHealth: "alive",
      now: baseNow,
      sport: "football",
    });

    assert.equal(evalResult.eventStatus, "PENALTIES");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
    assert.equal(evalResult.statusBadge, "PEN");
  });

  // 3. Trận V-League không có livescore (score = null)
  it("Test 3A: V-League không có livescore, lúc 80m (trong 105m tiêu chuẩn) -> giữ LIVE an toàn", () => {
    const kickoff80mAgo = baseNow - 80 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff80mAgo,
      score: null,
      streamHealth: "unknown",
      sourceStatus: "live",
      now: baseNow,
      sport: "football",
    });

    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });

  it("Test 3B: V-League không có livescore, lúc 120m (trong khoảng đệm 125m bù giờ) -> vẫn giữ LIVE", () => {
    const kickoff120mAgo = baseNow - 120 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff120mAgo,
      score: null,
      streamHealth: "unknown",
      sourceStatus: "live",
      now: baseNow,
      sport: "football",
    });

    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });

  it("Test 3C: V-League không có livescore, lúc 145m (quá khoảng đệm 125m, stream không alive) -> tự động FINISHED dù title còn 🟢", () => {
    const kickoff145mAgo = baseNow - 145 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff145mAgo,
      score: null,
      streamHealth: "unknown",
      sourceStatus: "live", // Ký tự 🟢 bị upstream bỏ quên
      now: baseNow,
      sport: "football",
    });

    assert.equal(evalResult.eventStatus, "FINISHED");
    assert.equal(evalResult.displayTimeline, "finished");
    assert.equal(evalResult.isLiveInWindow, false);
    assert.equal(evalResult.statusBadge, "FT");
  });

  it("Test 3D: V-League không có livescore, lúc 145m nhưng stream vẫn ALIVE thật sự -> giữ LIVE an toàn", () => {
    const kickoff145mAgo = baseNow - 145 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff145mAgo,
      score: null,
      streamHealth: "alive", // Stream thực tế vẫn đang phát
      sourceStatus: "live",
      now: baseNow,
      sport: "football",
    });

    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });

  // 4. Tennis trận kéo dài nhiều set
  it("Test 4A: Tennis kéo dài 5 set (260m = 4h20m) với stream alive -> tiếp tục LIVE", () => {
    const kickoff260mAgo = baseNow - 260 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff260mAgo,
      score: null,
      streamHealth: "alive",
      sourceStatus: "live",
      now: baseNow,
      sport: "tennis",
    });

    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });

  it("Test 4B: Tennis lúc 220m (quá buffer 210m) nhưng stream không alive -> FINISHED, không treo vô hạn", () => {
    const kickoff220mAgo = baseNow - 220 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff220mAgo,
      score: null,
      streamHealth: "unknown",
      sourceStatus: "live",
      now: baseNow,
      sport: "tennis",
    });

    assert.equal(evalResult.eventStatus, "FINISHED");
    assert.equal(evalResult.displayTimeline, "finished");
    assert.equal(evalResult.isLiveInWindow, false);
  });

  // 5. Esports trận kéo dài
  it("Test 5A: Esports BO5 kéo dài 5 giờ (300m) với stream alive -> tiếp tục LIVE", () => {
    const kickoff300mAgo = baseNow - 300 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff300mAgo,
      score: null,
      streamHealth: "alive",
      sourceStatus: "live",
      now: baseNow,
      sport: "esports",
    });

    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });

  it("Test 5B: Esports lúc 273m (FURIA 16:45 lúc 21:18) stream không active -> FINISHED, loại bỏ stale card", () => {
    const kickoff273mAgo = baseNow - 273 * 60 * 1000; // Trận 16:45 đến 21:18 là 273 phút
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff273mAgo,
      score: null,
      streamHealth: "unknown",
      sourceStatus: "live", // Upstream thtt bỏ quên cờ 🟢
      now: baseNow,
      sport: "esports",
    });

    assert.equal(evalResult.eventStatus, "FINISHED");
    assert.equal(evalResult.displayTimeline, "finished");
    assert.equal(evalResult.isLiveInWindow, false);
  });

  // 6. Bóng rổ có overtime
  it("Test 6A: Bóng rổ lúc 140m (trong khoảng đệm OT1 150m) -> LIVE an toàn", () => {
    const kickoff140mAgo = baseNow - 140 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff140mAgo,
      score: null,
      streamHealth: "unknown",
      sourceStatus: "live",
      now: baseNow,
      sport: "basketball",
    });

    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });

  it("Test 6B: Bóng rổ có nhiều overtime (180m = 3h) với stream alive -> tiếp tục LIVE", () => {
    const kickoff180mAgo = baseNow - 180 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff180mAgo,
      score: null,
      streamHealth: "alive",
      sourceStatus: "live",
      now: baseNow,
      sport: "basketball",
    });

    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });

  // 7. Trận đang LIVE nhưng nguồn livescore tạm thời lỗi (score = null)
  it("Test 7: Trận đang LIVE (60m sau kickoff) nhưng nguồn livescore tạm thời lỗi -> không bị ẩn nhầm", () => {
    const kickoff60mAgo = baseNow - 60 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff60mAgo,
      score: null, // Nguồn livescore mạng chập chờn
      streamHealth: "unknown",
      sourceStatus: "live",
      now: baseNow,
      sport: "football",
    });

    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });

  // 8. F5 nhiều lần để xác nhận trận FT không xuất hiện trở lại (filterLiveMatchesSnapshot)
  it("Test 8: F5 nhiều lần liên tiếp -> filterLiveMatchesSnapshot lọc sạch trận FT và trận cũ, kết quả bất biến", () => {
    const testSnapshot: LiveFootballData = {
      updatedAt: new Date(baseNow).toISOString(),
      channels: ["Bóng Đá"],
      matches: [
        // Match 1: Đang đá phút 45 (Hợp lệ LIVE)
        mockMatch({
          id: "m_live_1",
          time: "20:30",
          timestamp: baseNow - 45 * 60 * 1000,
          title: "Arsenal vs Chelsea",
          sport: "football",
          sourceStatus: "live",
          score: mockScore({ status: "live", displayClock: "45" }),
        }),
        // Match 2: Đã FT từ livescore (Phải bị loại)
        mockMatch({
          id: "m_ft_vleague",
          time: "18:00",
          timestamp: baseNow - 195 * 60 * 1000,
          title: "Hồng Lĩnh Hà Tĩnh vs Thép Xanh Nam Định",
          sport: "football",
          sourceStatus: "live",
          score: mockScore({ status: "finished", statusText: "FT", displayClock: "FT" }),
        }),
        // Match 3: Esports cũ lúc 16:45 (270m trước, stream không active -> Phải bị loại)
        mockMatch({
          id: "m_esports_furia",
          time: "16:45",
          timestamp: baseNow - 270 * 60 * 1000,
          title: "FURIA vs BetBoom Team",
          sport: "esports",
          sourceStatus: "live",
          score: undefined,
        }),
        // Match 4: Trận sắp diễn ra trong 30 phút nữa (Hợp lệ UPCOMING)
        mockMatch({
          id: "m_upcoming_1",
          time: "21:45",
          timestamp: baseNow + 30 * 60 * 1000,
          title: "Real Madrid vs Barcelona",
          sport: "football",
          sourceStatus: "upcoming",
        }),
      ],
    };

    // Mô phỏng 10 lần reload (F5) liên tiếp
    for (let f5Count = 1; f5Count <= 10; f5Count++) {
      const filtered = filterLiveMatchesSnapshot(testSnapshot, baseNow);
      const remainingIds = filtered.matches.map((m) => m.id);

      // Trận FT và trận Esports cũ 16:45 KHÔNG BAO GIỜ xuất hiện trở lại
      assert.equal(remainingIds.includes("m_ft_vleague"), false, `F5 lần ${f5Count}: Trận FT không được xuất hiện`);
      assert.equal(remainingIds.includes("m_esports_furia"), false, `F5 lần ${f5Count}: Trận 16:45 quá buffer không được xuất hiện`);

      // Các trận hợp lệ phải còn nguyên
      assert.equal(remainingIds.includes("m_live_1"), true, `F5 lần ${f5Count}: Trận đang LIVE phải còn`);
      assert.equal(remainingIds.includes("m_upcoming_1"), true, `F5 lần ${f5Count}: Trận sắp đá <= 2h phải còn`);
      assert.equal(filtered.matches.length, 2, `F5 lần ${f5Count}: Số trận giữ đúng 2 trận hợp lệ`);
    }
  });
});
