import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MATCH_CENTER_INTERVALS,
  calculateMatchCenterPollInterval,
  shouldRefreshOnTabFocus,
  shouldSkipDuplicateRequest,
} from "./matchCenterRealtime";

describe("Nanaflix /live - Match Center Realtime Polling & Deduplication", () => {
  it("1. Tính toán chu kỳ polling thích ứng chính xác theo trạng thái trận đấu", () => {
    // Trận đang diễn ra (isLive = true hoặc status = 'live') -> 30 giây
    assert.equal(calculateMatchCenterPollInterval("live", false), 30_000);
    assert.equal(calculateMatchCenterPollInterval("in_progress", true), 30_000);
    assert.equal(calculateMatchCenterPollInterval(undefined, true), 30_000);

    // Trận đã kết thúc -> 120 giây (giảm tải triệt để)
    assert.equal(calculateMatchCenterPollInterval("finished", false), 120_000);
    assert.equal(calculateMatchCenterPollInterval("post", false), 120_000);

    // Trận sắp diễn ra -> 60 giây
    assert.equal(calculateMatchCenterPollInterval("scheduled", false), 60_000);
    assert.equal(calculateMatchCenterPollInterval("pre", false), 60_000);
    assert.equal(calculateMatchCenterPollInterval(undefined, false), 60_000);
  });

  it("2. Xử lý khi người dùng quay lại tab trình duyệt (Tab Visibility Focus)", () => {
    const now = 100_000;

    // Chưa từng fetch (lastFetchedTime = 0) -> Cho phép fetch
    assert.equal(shouldRefreshOnTabFocus(0, 30_000, now), true);

    // Vừa mới fetch 5 giây trước (< 30s) -> Không fetch lại vô ích
    assert.equal(shouldRefreshOnTabFocus(now - 5_000, 30_000, now), false);

    // Đã trôi qua 30 giây hoặc lâu hơn -> Tự động refresh ngay
    assert.equal(shouldRefreshOnTabFocus(now - 30_000, 30_000, now), true);
    assert.equal(shouldRefreshOnTabFocus(now - 45_000, 30_000, now), true);

    // Với trận finished (interval 120s), nếu tab quay lại sau 35s cũng thỏa mãn ngưỡng 30s
    assert.equal(shouldRefreshOnTabFocus(now - 35_000, 120_000, now), true);
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

    // Request cùng key, vừa fetch 3 giây trước (< cooldown 8s) -> Chặn khi không force
    assert.equal(
      shouldSkipDuplicateRequest({
        currentKey: key1,
        lastFetchedKey: key1,
        lastFetchedTime: now - 3_000,
        inFlight: false,
        force: false,
        now,
      }),
      true
    );

    // Request cùng key, vừa fetch 3 giây trước nhưng force = true (ví dụ click nút Làm mới) -> Cho phép
    assert.equal(
      shouldSkipDuplicateRequest({
        currentKey: key1,
        lastFetchedKey: key1,
        lastFetchedTime: now - 3_000,
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
});
