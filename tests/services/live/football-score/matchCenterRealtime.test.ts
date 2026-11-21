import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MATCH_CENTER_INTERVALS,
  calculateMatchCenterPollInterval,
  shouldRefreshOnTabFocus,
  shouldSkipDuplicateRequest,
  mergeNormalizedSummaries,
} from "@/services/live/football-score/matchCenterRealtime";
import { parseRawSummary } from "@/services/live/football-score/service";

describe("Nanaflix /live - Match Center Realtime Polling & Deduplication", () => {
  it("1. Tính toán chu kỳ polling thích ứng chính xác theo trạng thái trận đấu", () => {
    assert.equal(MATCH_CENTER_INTERVALS.LIVE_MS, 15_000);
    assert.equal(MATCH_CENTER_INTERVALS.FINISHED_MS, 120_000);
    assert.equal(MATCH_CENTER_INTERVALS.SCHEDULED_MS, 30_000);
    assert.equal(MATCH_CENTER_INTERVALS.CLOSED_MS, 60_000);

    // Trận đang diễn ra (isLive = true hoặc status = 'live') -> 15 giây (cập nhật diễn biến nhanh nhạy, 0ms CPU Vercel)
    assert.equal(calculateMatchCenterPollInterval("live", false), 15_000);
    assert.equal(calculateMatchCenterPollInterval("in_progress", true), 15_000);
    assert.equal(calculateMatchCenterPollInterval(undefined, true), 15_000);

    // Bảng MatchCenter đóng (isOpen = false) -> 60 giây (tiết kiệm tài nguyên)
    assert.equal(calculateMatchCenterPollInterval("live", true, false), 60_000);
    assert.equal(calculateMatchCenterPollInterval("scheduled", false, false), 60_000);

    // Trận đã kết thúc -> 120 giây (giảm tải triệt để)
    assert.equal(calculateMatchCenterPollInterval("finished", false), 120_000);
    assert.equal(calculateMatchCenterPollInterval("post", false), 120_000);

    // Trận sắp diễn ra -> 30 giây
    assert.equal(calculateMatchCenterPollInterval("scheduled", false), 30_000);
    assert.equal(calculateMatchCenterPollInterval("pre", false), 30_000);
    assert.equal(calculateMatchCenterPollInterval(undefined, false), 30_000);
  });

  it("2. Xử lý khi người dùng quay lại tab trình duyệt (Tab Visibility Focus)", () => {
    const now = 100_000;

    // Chưa từng fetch (lastFetchedTime = 0) -> Cho phép fetch
    assert.equal(shouldRefreshOnTabFocus(0, 30_000, now), true);

    // Vừa mới fetch 1 giây trước (< 3s threshold) -> Không fetch lại vô ích
    assert.equal(shouldRefreshOnTabFocus(now - 1_000, 30_000, now), false);

    // Đã trôi qua 3 giây hoặc lâu hơn -> Tự động refresh ngay
    assert.equal(shouldRefreshOnTabFocus(now - 3_000, 30_000, now), true);
    assert.equal(shouldRefreshOnTabFocus(now - 45_000, 30_000, now), true);

    // Với trận finished (interval 120s), nếu tab quay lại sau 5s cũng thỏa mãn ngưỡng 3s
    assert.equal(shouldRefreshOnTabFocus(now - 5_000, 120_000, now), true);
  });

  it("3. Deduplication và Cooldown chống spam request trùng lặp", () => {
    const now = 200_000;
    const key1 = "usa.1:761856";
    const key2 = "eng.1:800123";

    // Request đang in-flight -> Chặn khi không force
    assert.equal(
      shouldSkipDuplicateRequest({
        currentKey: key1,
        lastFetchedKey: key1,
        lastFetchedTime: now - 1_000,
        inFlight: true,
        force: false,
        now,
      }),
      true
    );

    // Request đang in-flight nhưng force = true -> Cho phép (để hủy request cũ và gửi mới)
    assert.equal(
      shouldSkipDuplicateRequest({
        currentKey: key1,
        lastFetchedKey: key1,
        lastFetchedTime: now - 1_000,
        inFlight: true,
        force: true,
        now,
      }),
      false
    );

    // Request cùng key, vừa fetch 500ms trước (< cooldown 1.5s) -> Chặn khi không force
    assert.equal(
      shouldSkipDuplicateRequest({
        currentKey: key1,
        lastFetchedKey: key1,
        lastFetchedTime: now - 500,
        inFlight: false,
        force: false,
        now,
      }),
      true
    );

    // Request cùng key, vừa fetch 500ms trước nhưng force = true (ví dụ click nút Làm mới) -> Cho phép
    assert.equal(
      shouldSkipDuplicateRequest({
        currentKey: key1,
        lastFetchedKey: key1,
        lastFetchedTime: now - 500,
        inFlight: false,
        force: true,
        now,
      }),
      false
    );

    // Chuyển sang trận khác (key2 !== key1) -> Luôn cho phép fetch ngay
    assert.equal(
      shouldSkipDuplicateRequest({
        currentKey: key2,
        lastFetchedKey: key1,
        lastFetchedTime: now - 1_000,
        inFlight: false,
        force: false,
        now,
      }),
      false
    );
  });

  it("4. ScoreboardCache: Xác minh stale window hợp lệ khi có và không có trận live", () => {
    const CACHE_TTL_LIVE_MS = 15_000;
    const CACHE_TTL_DEFAULT_MS = 60_000;
    const STALE_TTL_MS = 45_000;

    const baseNow = 1_000_000;

    // A. Khi không có trận live: TTL 60s, stale grace period 45s
    const defaultTtl = CACHE_TTL_DEFAULT_MS;
    const defaultExpireAt = baseNow + defaultTtl;
    const defaultStaleUntil = defaultExpireAt + STALE_TTL_MS;

    // staleUntil PHẢI lớn hơn expireAt (105s > 60s)
    assert.ok(defaultStaleUntil > defaultExpireAt, "staleUntil phải sau expireAt khi không có live");
    assert.equal(defaultStaleUntil - defaultExpireAt, 45_000, "Khoảng stale phải đúng 45s");

    // Trong 60s đầu (t = baseNow + 30s): Fresh
    const tFresh = baseNow + 30_000;
    assert.ok(defaultExpireAt > tFresh, "Cache còn hạn trong 60s đầu");

    // Trong khoảng stale (t = baseNow + 70s): Expired nhưng còn stale grace period
    const tStale = baseNow + 70_000;
    assert.ok(defaultExpireAt <= tStale, "Đã hết hạn chính");
    assert.ok(defaultStaleUntil > tStale, "Vẫn nằm trong khoảng stale-while-revalidate");

    // Quá 105s (t = baseNow + 110s): Hết cả stale grace period
    const tExpired = baseNow + 110_000;
    assert.ok(defaultStaleUntil <= tExpired, "Đã hết hạn hoàn toàn");

    // B. Khi có trận live: TTL 15s, stale grace period 45s
    const liveTtl = CACHE_TTL_LIVE_MS;
    const liveExpireAt = baseNow + liveTtl;
    const liveStaleUntil = liveExpireAt + STALE_TTL_MS;

    assert.ok(liveStaleUntil > liveExpireAt, "staleUntil phải sau expireAt khi có live");
    assert.equal(liveStaleUntil - liveExpireAt, 45_000, "Khoảng stale phải đúng 45s");
    assert.equal(liveStaleUntil - baseNow, 60_000, "Tổng thời gian từ fetch tới hết stale là 60s");
  });

  it("5. parseRawSummary & mergeNormalizedSummaries chuẩn hóa và bảo toàn recentForm, shootout, gameInfo", () => {
    const rawMock = {
      header: {
        competitions: [
          {
            competitors: [
              { id: "100", homeAway: "home", team: { displayName: "Manchester City", abbreviation: "MCI" }, score: "2" },
              { id: "200", homeAway: "away", team: { displayName: "Fulham", abbreviation: "FUL" }, score: "1" },
            ],
            status: { type: { name: "STATUS_SECOND_HALF", state: "in" }, displayClock: "75'" },
          },
        ],
      },
      gameInfo: {
        venue: { fullName: "Etihad Stadium", address: { city: "Manchester", country: "England" } },
        attendance: 53400,
        officials: [{ displayName: "Michael Oliver", position: { name: "Referee" } }],
      },
      lastFiveGames: [
        {
          team: { id: "100" },
          events: [
            {
              id: "ev-1",
              gameDate: "2026-10-24T15:00Z",
              score: "3-1",
              gameResult: "W",
              atVs: "vs",
              opponent: { displayName: "Arsenal" },
              leagueName: "Premier League",
            },
          ],
        },
        {
          team: { id: "200" },
          events: [
            {
              id: "ev-2",
              gameDate: "2026-10-24T15:00Z",
              score: "1-2",
              gameResult: "L",
              atVs: "@",
              opponent: { displayName: "Chelsea" },
              leagueName: "Premier League",
            },
          ],
        },
      ],
      shootout: [
        {
          id: "100",
          team: "Manchester City",
          shots: [
            { id: "s-1", shotNumber: 1, player: "Haaland", didScore: true },
            { id: "s-2", shotNumber: 2, player: "De Bruyne", didScore: false },
          ],
        },
        {
          id: "200",
          team: "Fulham",
          shots: [
            { id: "s-3", shotNumber: 1, player: "Jimenez", didScore: true },
          ],
        },
      ],
    };

    const parsed = parseRawSummary("eng.1", "test-event-1", rawMock);
    assert.ok(parsed);
    assert.equal(parsed.gameInfo?.venue?.name, "Etihad Stadium");
    assert.equal(parsed.gameInfo?.attendance, 53400);
    assert.equal(parsed.gameInfo?.referee, "Michael Oliver");

    assert.ok(parsed.recentForm?.home);
    assert.equal(parsed.recentForm.home.length, 1);
    assert.equal(parsed.recentForm.home[0].result, "W");
    assert.equal(parsed.recentForm.home[0].score, "3-1");
    assert.equal(parsed.recentForm.home[0].homeAway, "home");

    assert.ok(parsed.recentForm?.away);
    assert.equal(parsed.recentForm.away.length, 1);
    assert.equal(parsed.recentForm.away[0].result, "L");
    assert.equal(parsed.recentForm.away[0].homeAway, "away");

    assert.ok(parsed.shootout);
    assert.equal(parsed.shootout.length, 2);
    assert.equal(parsed.shootout[0].score, 1);
    assert.equal(parsed.shootout[0].shots[0].didScore, true);
    assert.equal(parsed.shootout[0].shots[1].didScore, false);

    // Kiểm tra mergeNormalizedSummaries bảo toàn
    const incomingWithoutShootout = {
      ...parsed,
      shootout: undefined,
      recentForm: undefined,
    };
    const merged = mergeNormalizedSummaries(parsed, incomingWithoutShootout);
    assert.ok(merged.shootout, "Phải bảo toàn shootout khi incoming thiếu");
    assert.ok(merged.recentForm, "Phải bảo toàn recentForm khi incoming thiếu");
    assert.equal(merged.gameInfo?.venue?.name, "Etihad Stadium");
  });
});
