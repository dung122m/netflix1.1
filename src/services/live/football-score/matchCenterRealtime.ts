/**
 * matchCenterRealtime.ts
 * Quản lý logic chu kỳ polling, cooldown, tab visibility và deduplication cho Match Center.
 */

export const MATCH_CENTER_INTERVALS = {
  LIVE_MS: 30_000,        // 30s khi trận đang diễn ra
  FINISHED_MS: 120_000,   // 120s khi trận đã kết thúc (giảm tải)
  SCHEDULED_MS: 60_000,   // 60s khi trận sắp diễn ra
  COOLDOWN_MS: 8_000,     // 8s cooldown chống spam request cho cùng 1 trận
  TAB_RETURN_THRESHOLD_MS: 30_000, // 30s ngưỡng kích hoạt refresh khi quay lại tab
} as const;

/**
 * Tính toán chu kỳ polling thích ứng theo trạng thái trận đấu.
 */
export function calculateMatchCenterPollInterval(
  status?: string | null,
  isLive?: boolean
): number {
  const currentStatus = (status || "").toLowerCase();
  const isMatchLive = Boolean(isLive || currentStatus === "live");
  const isMatchFinished = currentStatus === "finished" || currentStatus === "post";

  if (isMatchLive) {
    return MATCH_CENTER_INTERVALS.LIVE_MS;
  }
  if (isMatchFinished) {
    return MATCH_CENTER_INTERVALS.FINISHED_MS;
  }
  return MATCH_CENTER_INTERVALS.SCHEDULED_MS;
}

/**
 * Kiểm tra xem có cần trigger refresh khi người dùng chuyển tab trở lại không.
 */
export function shouldRefreshOnTabFocus(
  lastFetchedTime: number,
  intervalMs: number,
  now: number = Date.now()
): boolean {
  if (lastFetchedTime <= 0) return true;
  const elapsed = now - lastFetchedTime;
  const threshold = Math.min(intervalMs, MATCH_CENTER_INTERVALS.TAB_RETURN_THRESHOLD_MS);
  return elapsed >= threshold;
}

/**
 * Kiểm tra xem request có bị chặn do trùng lặp hoặc đang in-flight hay không.
 */
export function shouldSkipDuplicateRequest(options: {
  currentKey: string;
  lastFetchedKey: string;
  lastFetchedTime: number;
  inFlight: boolean;
  force: boolean;
  minCooldownMs?: number;
  now?: number;
}): boolean {
  const {
    currentKey,
    lastFetchedKey,
    lastFetchedTime,
    inFlight,
    force,
    minCooldownMs = MATCH_CENTER_INTERVALS.COOLDOWN_MS,
    now = Date.now(),
  } = options;

  // Nếu đang có request chạy dở và không bị ép buộc (force) -> bỏ qua
  if (inFlight && !force) {
    return true;
  }

  // Nếu cùng key và thời gian kể từ lần fetch trước chưa vượt quá cooldown -> bỏ qua
  if (
    !force &&
    currentKey === lastFetchedKey &&
    now - lastFetchedTime < minCooldownMs
  ) {
    return true;
  }

  return false;
}
