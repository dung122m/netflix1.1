import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isValidKickoffTimestamp,
  formatKickoffTime,
  resolveMatchDisplayStatus,
} from "./liveStatus";
import { LiveMatchScore } from "./types";

describe("Nanaflix /live - Kiểm soát nhãn 'Đang phát trực tiếp'", () => {
  // 1. Phải có giờ kickoff hợp lệ: Parse timestamp chính xác, UTC và múi giờ Asia/Ho_Chi_Minh
  it("1. Kiểm tra timestamp kickoff hợp lệ và không tự tạo khi thiếu", () => {
    assert.equal(isValidKickoffTimestamp(undefined), false);
    assert.equal(isValidKickoffTimestamp(null), false);
    assert.equal(isValidKickoffTimestamp(0), false);
    assert.equal(isValidKickoffTimestamp(-1000), false);
    assert.equal(isValidKickoffTimestamp(Number.MAX_SAFE_INTEGER), false);
    assert.equal(isValidKickoffTimestamp(Number.NaN), false);
    assert.equal(isValidKickoffTimestamp(Infinity), false);

    const validTs = new Date("2026-10-11T19:30:00+07:00").getTime();
    assert.equal(isValidKickoffTimestamp(validTs), true);
  });

  // 2. Trận qua nửa đêm theo giờ Việt Nam
  it("2. Xử lý nhất quán UTC và múi giờ Asia/Ho_Chi_Minh kể cả trận qua nửa đêm", () => {
    // 01:45 sáng ngày 25/09 tại Việt Nam (UTC: 24/09 18:45:00Z)
    const midnightMatch = new Date("2026-09-24T18:45:00.000Z").getTime();
    const formatted = formatKickoffTime(midnightMatch);
    assert.equal(formatted, "01:45");

    // 03:00 sáng ngày hôm sau tại Việt Nam (UTC: 20:00:00Z)
    const earlyMorningMatch = new Date("2026-09-24T20:00:00.000Z").getTime();
    assert.equal(formatKickoffTime(earlyMorningMatch), "03:00");

    // Khi thiếu giờ đá: trả về null, không tự đoán
    assert.equal(formatKickoffTime(undefined), null);
    assert.equal(formatKickoffTime(null), null);
    assert.equal(formatKickoffTime(0), null);
    assert.equal(formatKickoffTime(Number.MAX_SAFE_INTEGER), null);
  });

  // 3. Trận chưa đến giờ đá
  it("3. Trận chưa đến giờ đá: hiển thị giờ đá hoặc sắp diễn ra, không gắn nhãn live", () => {
    const futureKickoff = new Date("2026-10-11T22:00:00+07:00").getTime();
    const now = new Date("2026-10-11T20:00:00+07:00").getTime();

    // Chưa có livescore
    const resNoScore = resolveMatchDisplayStatus({
      timestamp: futureKickoff,
      score: null,
      now,
    });
    assert.equal(resNoScore.isConfirmedLive, false);
    assert.equal(resNoScore.statusType, "upcoming");
    assert.equal(resNoScore.badgeLabel, null);
    assert.equal(resNoScore.kickoffTime, "22:00");

    // Có livescore nhưng ở trạng thái scheduled
    const scheduledScore: LiveMatchScore = {
      eventId: "e1",
      leagueSlug: "eng.1",
      team1Score: 0,
      team2Score: 0,
      homeScore: 0,
      awayScore: 0,
      isReversed: false,
      status: "scheduled",
      updatedAt: new Date().toISOString(),
    };
    const resScheduled = resolveMatchDisplayStatus({
      timestamp: futureKickoff,
      score: scheduledScore,
      now,
    });
    assert.equal(resScheduled.isConfirmedLive, false);
    assert.equal(resScheduled.statusType, "upcoming");
    assert.equal(resScheduled.badgeLabel, null);
    assert.equal(resScheduled.kickoffTime, "22:00");
  });

  // 4. Trận có giờ đá và livescore xác nhận đang diễn ra
  it("4. Trận có giờ đá và livescore xác nhận đang diễn ra: hiển thị nhãn LIVE và đồng hồ", () => {
    const kickoff = new Date("2026-10-11T20:00:00+07:00").getTime();
    const now = new Date("2026-10-11T20:35:00+07:00").getTime();

    const liveScore: LiveMatchScore = {
      eventId: "e2",
      leagueSlug: "eng.1",
      team1Score: 1,
      team2Score: 0,
      homeScore: 1,
      awayScore: 0,
      isReversed: false,
      status: "live",
      displayClock: "35'",
      statusDetail: "35' - 1st Half",
      updatedAt: new Date().toISOString(),
    };

    const resLive = resolveMatchDisplayStatus({
      timestamp: kickoff,
      score: liveScore,
      now,
    });

    assert.equal(resLive.isConfirmedLive, true);
    assert.equal(resLive.statusType, "live");
    assert.equal(resLive.badgeLabel, "LIVE 35'");
    assert.equal(resLive.displayClock, "35'");
    assert.equal(resLive.kickoffTime, "20:00");
  });

  // 5. Trận đã kết thúc hoặc bị hoãn, hủy, gián đoạn
  it("5. Trận đã kết thúc hoặc bị hoãn: không gắn nhãn live, hiển thị đúng trạng thái nguồn", () => {
    const kickoff = new Date("2026-10-11T18:00:00+07:00").getTime();

    // 5A. Đã kết thúc (FT)
    const finishedScore: LiveMatchScore = {
      eventId: "e3",
      leagueSlug: "eng.1",
      team1Score: 2,
      team2Score: 1,
      homeScore: 2,
      awayScore: 1,
      isReversed: false,
      status: "finished",
      displayClock: "FT",
      updatedAt: new Date().toISOString(),
    };
    const resFinished = resolveMatchDisplayStatus({
      timestamp: kickoff,
      score: finishedScore,
    });
    assert.equal(resFinished.isConfirmedLive, false);
    assert.equal(resFinished.statusType, "finished");
    assert.equal(resFinished.badgeLabel, "FT");

    // 5B. Bị hoãn (Postponed)
    const postponedScore: LiveMatchScore = {
      eventId: "e4",
      leagueSlug: "eng.1",
      team1Score: 0,
      team2Score: 0,
      homeScore: 0,
      awayScore: 0,
      isReversed: false,
      status: "scheduled",
      statusDetail: "Postponed",
      updatedAt: new Date().toISOString(),
    };
    const resPostponed = resolveMatchDisplayStatus({
      timestamp: kickoff,
      score: postponedScore,
    });
    assert.equal(resPostponed.isConfirmedLive, false);
    assert.equal(resPostponed.statusType, "postponed");
    assert.equal(resPostponed.badgeLabel, "Hoãn");

    // 5C. Bị hủy (Canceled)
    const canceledScore: LiveMatchScore = {
      eventId: "e5",
      leagueSlug: "eng.1",
      team1Score: 0,
      team2Score: 0,
      homeScore: 0,
      awayScore: 0,
      isReversed: false,
      status: "scheduled",
      statusDetail: "Canceled",
      updatedAt: new Date().toISOString(),
    };
    const resCanceled = resolveMatchDisplayStatus({
      timestamp: kickoff,
      score: canceledScore,
    });
    assert.equal(resCanceled.isConfirmedLive, false);
    assert.equal(resCanceled.statusType, "canceled");
    assert.equal(resCanceled.badgeLabel, "Hủy");

    // 5D. Tạm hoãn / Gián đoạn (Suspended)
    const suspendedScore: LiveMatchScore = {
      eventId: "e6",
      leagueSlug: "eng.1",
      team1Score: 0,
      team2Score: 0,
      homeScore: 0,
      awayScore: 0,
      isReversed: false,
      status: "scheduled",
      statusDetail: "Suspended",
      updatedAt: new Date().toISOString(),
    };
    const resSuspended = resolveMatchDisplayStatus({
      timestamp: kickoff,
      score: suspendedScore,
    });
    assert.equal(resSuspended.isConfirmedLive, false);
    assert.equal(resSuspended.statusType, "suspended");
    assert.equal(resSuspended.badgeLabel, "Tạm hoãn");
  });

  // 6. Trận thiếu giờ đá hoặc timestamp lỗi: không tự suy đoán live
  it("6. Trận thiếu giờ đá hoặc timestamp lỗi: không tự suy đoán live, giữ trạng thái an toàn", () => {
    // Trường hợp timestamp = MAX_SAFE_INTEGER
    const resInvalid = resolveMatchDisplayStatus({
      timestamp: Number.MAX_SAFE_INTEGER,
      score: null,
    });
    assert.equal(resInvalid.isConfirmedLive, false);
    assert.equal(resInvalid.statusType, "safe_idle");
    assert.equal(resInvalid.badgeLabel, null);
    assert.equal(resInvalid.kickoffTime, null);

    // Dù có dữ liệu livescore báo live, nhưng timestamp nguồn bị thiếu/lỗi -> không tự gán nhãn
    const fakeLiveScore: LiveMatchScore = {
      eventId: "e_err",
      leagueSlug: "eng.1",
      team1Score: 1,
      team2Score: 1,
      homeScore: 1,
      awayScore: 1,
      isReversed: false,
      status: "live",
      updatedAt: new Date().toISOString(),
    };
    const resConflict = resolveMatchDisplayStatus({
      timestamp: undefined,
      score: fakeLiveScore,
    });
    assert.equal(resConflict.isConfirmedLive, false);
    assert.equal(resConflict.statusType, "safe_idle");
    assert.equal(resConflict.badgeLabel, null);
  });

  // 7. Không để nhãn live xuất hiện chỉ vì trận có link stream hoặc timeline === "live"
  it("7. Không để nhãn live xuất hiện chỉ vì có link stream hoặc timeline inferred", () => {
    const kickoff = new Date("2026-10-11T20:00:00+07:00").getTime();
    const now = new Date("2026-10-11T20:30:00+07:00").getTime();

    // Trận rơi vào khung 140 phút (inferred time), nhưng livescore CHƯA xác nhận (null)
    const resStreamOnly = resolveMatchDisplayStatus({
      timestamp: kickoff,
      score: null, // Không có bằng chứng livescore
      now,
    });
    assert.equal(resStreamOnly.isConfirmedLive, false);
    assert.equal(resStreamOnly.badgeLabel, null);
    assert.equal(resStreamOnly.kickoffTime, "20:00");
  });
});
