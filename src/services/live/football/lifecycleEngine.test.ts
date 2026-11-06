import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateEventLifecycle,
} from "./lifecycleEngine";
import { LiveMatchScore } from "@/services/live/football-score/types";

describe("Adaptive Hybrid Event Lifecycle Engine — 15 Regression Scenarios", () => {
  const baseNow = new Date("2026-11-06T12:00:00Z").getTime();

  function mockScore(overrides: Partial<LiveMatchScore> & { statusText?: string }): LiveMatchScore {
    return {
      eventId: "mock-e1",
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

  // 1. Bóng đá 90 phút kết thúc bình thường (110m sau kickoff, stream đã ngắt hoặc FT) -> FINISHED
  it("Scenario 1: Bóng đá 90 phút kết thúc bình thường -> FINISHED", () => {
    const kickoff110mAgo = baseNow - 110 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff110mAgo,
      streamHealth: "dead",
      sourceStatus: "unknown",
      now: baseNow,
      sport: "football",
    });
    assert.equal(evalResult.eventStatus, "FINISHED");
    assert.equal(evalResult.displayTimeline, "finished");
    assert.equal(evalResult.isLiveInWindow, false);
  });

  // 2. Bóng đá có 2 hiệp phụ (140m sau kickoff, livescore báo OVERTIME hoặc stream alive) -> LIVE với badge ET
  it("Scenario 2: Bóng đá có 2 hiệp phụ (140m) -> LIVE với badge ET", () => {
    const kickoff140mAgo = baseNow - 140 * 60 * 1000;
    const scoreET = mockScore({
      eventId: "m1",
      homeScore: 1,
      awayScore: 1,
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

  // 3. Bóng đá đá penalty shootout (165m sau kickoff, livescore báo SHOOTOUT) -> LIVE với badge PEN
  it("Scenario 3: Bóng đá đá penalty shootout (165m) -> LIVE với badge PEN", () => {
    const kickoff165mAgo = baseNow - 165 * 60 * 1000;
    const scorePen = mockScore({
      eventId: "m2",
      homeScore: 1,
      awayScore: 1,
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

  // 4. Trận nghỉ giữa hiệp (50m sau kickoff, livescore HALFTIME) -> LIVE với badge HT
  it("Scenario 4: Trận nghỉ giữa hiệp (50m) -> LIVE với badge HT", () => {
    const kickoff50mAgo = baseNow - 50 * 60 * 1000;
    const scoreHT = mockScore({
      eventId: "m3",
      homeScore: 2,
      awayScore: 0,
      status: "live",
      statusText: "STATUS_HALFTIME",
      statusDetail: "Halftime",
      displayClock: "HT",
    });
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff50mAgo,
      score: scoreHT,
      now: baseNow,
      sport: "football",
    });
    assert.equal(evalResult.eventStatus, "HALFTIME");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.statusBadge, "HT");
  });

  // 5. Trận bị tạm dừng do thời tiết (suspended) -> SUSPENDED, không tự ý FINISHED
  it("Scenario 5: Trận bị tạm hoãn do thời tiết -> SUSPENDED, giữ hiển thị", () => {
    const kickoff70mAgo = baseNow - 70 * 60 * 1000;
    const scoreSuspended = mockScore({
      eventId: "m4",
      homeScore: 0,
      awayScore: 0,
      status: "live",
      statusText: "SUSPENDED",
      statusDetail: "Tạm hoãn do mưa lớn",
      displayClock: "42'",
    });
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff70mAgo,
      score: scoreSuspended,
      now: baseNow,
      sport: "football",
    });
    assert.equal(evalResult.eventStatus, "SUSPENDED");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.statusBadge, "Tạm hoãn");
  });

  // 6. Livescore tạm thời mất kết nối (score = null, stream alive) -> tiếp tục LIVE an toàn
  it("Scenario 6: Livescore tạm thời mất kết nối (score = null, stream alive) -> tiếp tục LIVE an toàn", () => {
    const kickoff60mAgo = baseNow - 60 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff60mAgo,
      score: null,
      streamHealth: "alive",
      sourceStatus: "live",
      now: baseNow,
      sport: "football",
    });
    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });

  // 7. Stream mất kết nối tạm thời nhưng trận vẫn LIVE (livescore báo 2H 75') -> vẫn LIVE
  it("Scenario 7: Stream mất kết nối tạm thời nhưng livescore 2H 75' -> vẫn LIVE", () => {
    const kickoff85mAgo = baseNow - 85 * 60 * 1000;
    const scorePlaying = mockScore({
      eventId: "m5",
      homeScore: 1,
      awayScore: 0,
      status: "live",
      statusText: "STATUS_SECOND_HALF",
      statusDetail: "75'",
      displayClock: "75",
    });
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff85mAgo,
      score: scorePlaying,
      streamHealth: "dead", // Stream tạm đứt segment nhưng livescore xác nhận sân cỏ đang đá
      now: baseNow,
      sport: "football",
    });
    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.confidence, "authoritative");
  });

  // 8. Stream vẫn phát (nhà đài phát lại/chờ) sau khi trận đã FT -> FINISHED (không bị zombie stream kéo lại LIVE)
  it("Scenario 8: Stream vẫn phát sau khi trận đã FT -> FINISHED (chống zombie stream)", () => {
    const kickoff150mAgo = baseNow - 150 * 60 * 1000;
    const scoreFT = mockScore({
      eventId: "m6",
      homeScore: 2,
      awayScore: 1,
      status: "finished",
      statusText: "STATUS_FULL_TIME",
      statusDetail: "FT",
      displayClock: "FT",
    });
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff150mAgo,
      score: scoreFT,
      streamHealth: "alive", // BLV quên tắt máy phát
      sourceStatus: "live",
      now: baseNow,
      sport: "football",
    });
    assert.equal(evalResult.eventStatus, "FINISHED");
    assert.equal(evalResult.displayTimeline, "finished");
    assert.equal(evalResult.confidence, "authoritative");
  });

  // 9. Tennis kéo dài 5 set (260m = 4h20m, stream alive) -> LIVE
  it("Scenario 9: Tennis kéo dài 5 set (260m, stream alive) -> LIVE", () => {
    const kickoff260mAgo = baseNow - 260 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff260mAgo,
      streamHealth: "alive",
      sourceStatus: "live",
      now: baseNow,
      sport: "tennis",
    });
    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });

  // 10. Basketball có nhiều overtime (180m = 3h, stream alive) -> LIVE
  it("Scenario 10: Basketball có nhiều overtime (180m, stream alive) -> LIVE", () => {
    const kickoff180mAgo = baseNow - 180 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff180mAgo,
      streamHealth: "alive",
      sourceStatus: "live",
      now: baseNow,
      sport: "basketball",
    });
    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });

  // 11. Esports BO5 kéo dài 5 giờ (300m) có pause và remake (stream alive) -> LIVE
  it("Scenario 11: Esports BO5 kéo dài 5 giờ (300m) với stream alive -> LIVE", () => {
    const kickoff300mAgo = baseNow - 300 * 60 * 1000; // 5 giờ trước
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff300mAgo,
      streamHealth: "alive",
      sourceStatus: "live",
      now: baseNow,
      sport: "esports",
    });
    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });

  // 12. Upstream gỡ trận (sourceStatus = finished / unlisted) -> FINISHED
  it("Scenario 12: Upstream gỡ trận (sourceStatus = finished) -> FINISHED", () => {
    const kickoff60mAgo = baseNow - 60 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff60mAgo,
      sourceStatus: "finished",
      streamHealth: "alive",
      now: baseNow,
      sport: "football",
    });
    assert.equal(evalResult.eventStatus, "FINISHED");
    assert.equal(evalResult.displayTimeline, "finished");
    assert.equal(evalResult.listingStatus, "UNLISTED");
  });

  // 13. API trả về dữ liệu cũ / chập chờn -> giữ trạng thái an toàn
  it("Scenario 13: Không có tín hiệu mới, trong thời gian đá tiêu chuẩn -> giữ LIVE an toàn", () => {
    const kickoff80mAgo = baseNow - 80 * 60 * 1000;
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff80mAgo,
      sourceStatus: "unknown",
      streamHealth: "unknown",
      now: baseNow,
      sport: "football",
    });
    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
  });

  // 14. FINISHED không bị chuyển ngược thành LIVE sai lệch
  it("Scenario 14: Trận đã xác nhận FINISHED không bao giờ bị chuyển ngược thành LIVE", () => {
    const kickoff200mAgo = baseNow - 200 * 60 * 1000;
    const scoreFinished = mockScore({
      eventId: "m7",
      homeScore: 3,
      awayScore: 0,
      status: "finished",
      statusText: "FT",
    });
    // Dù nguồn stream báo alive hay có cờ live lặp lại, kết quả vẫn phải là FINISHED
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff200mAgo,
      score: scoreFinished,
      streamHealth: "alive",
      sourceStatus: "live",
      now: baseNow,
      sport: "football",
    });
    assert.equal(evalResult.eventStatus, "FINISHED");
    assert.equal(evalResult.displayTimeline, "finished");
  });

  // 15. Cache hết hạn không làm mất trạng thái trận đang diễn ra (revalidate cycle)
  it("Scenario 15: Cache hết hạn / revalidate không làm rớt trận LIVE thành finished", () => {
    const kickoff90mAgo = baseNow - 90 * 60 * 1000;
    // Khi cache TTL của scoreboard hết hạn, score tạm thời null trước khi re-fetch
    const evalResult = evaluateEventLifecycle({
      timestamp: kickoff90mAgo,
      score: null,
      streamHealth: "alive",
      sourceStatus: "live",
      now: baseNow,
      sport: "football",
    });
    assert.equal(evalResult.eventStatus, "LIVE");
    assert.equal(evalResult.displayTimeline, "live");
    assert.equal(evalResult.isLiveInWindow, true);
  });
});

