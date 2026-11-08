/**
 * matchCenterRealtime.ts
 * Quản lý logic chu kỳ polling, cooldown, tab visibility và deduplication cho Match Center.
 */

import {
  NormalizedMatchSummary,
  MatchKeyEvent,
  MatchCommentaryItem,
} from "./types";

export const MATCH_CENTER_INTERVALS = {
  LIVE_MS: 5_000,         // 5s khi trận đang diễn ra (realtime cao độ cho diễn biến & sự kiện)
  FINISHED_MS: 120_000,   // 120s khi trận đã kết thúc (giảm tải)
  SCHEDULED_MS: 30_000,   // 30s khi trận sắp diễn ra
  COOLDOWN_MS: 1_500,     // 1.5s cooldown chống spam request cho cùng 1 trận
  TAB_RETURN_THRESHOLD_MS: 3_000, // 3s ngưỡng kích hoạt refresh tức thì khi quay lại tab
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

/**
 * Trích xuất số phút từ chuỗi hiển thị đồng hồ trận đấu (ví dụ: "45'+2'" -> 45)
 */
function parseClockMinute(raw?: string): number {
  if (!raw) return 0;
  const m = raw.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Hợp nhất đơn điệu (Monotonic Merge) hai bản tóm tắt trận đấu (Match Summary).
 * Đảm bảo:
 * 1. Các sự kiện (keyEvents: bàn thắng, thẻ phạt, thay người...) và bình luận (commentary)
 *    đã từng xuất hiện sẽ KHÔNG BAO GIỜ bị xóa hay ghi đè mất bởi snapshot cũ/trễ từ upstream CDN.
 * 2. Giữ nguyên thứ tự thời gian chuẩn xác.
 * 3. Chống tụt lùi đồng hồ và tỷ số nếu snapshot từ upstream tạm thời trễ hơn snapshot hiện tại.
 */
export function mergeNormalizedSummaries(
  existing: NormalizedMatchSummary,
  incoming: NormalizedMatchSummary
): NormalizedMatchSummary {
  if (existing.eventId !== incoming.eventId) {
    return incoming;
  }

  // 1. Hợp nhất Key Events (không bao giờ làm rơi rụng sự kiện đã xảy ra)
  const eventMap = new Map<string, MatchKeyEvent>();
  for (const ev of existing.events || []) {
    const key = ev.id && !ev.id.startsWith("fallback-")
      ? ev.id
      : `${ev.minute}_${ev.type}_${(ev.playerName || "").trim().toLowerCase()}_${(ev.text || "").trim().toLowerCase()}`;
    eventMap.set(key, ev);
  }
  for (const ev of incoming.events || []) {
    const key = ev.id && !ev.id.startsWith("fallback-")
      ? ev.id
      : `${ev.minute}_${ev.type}_${(ev.playerName || "").trim().toLowerCase()}_${(ev.text || "").trim().toLowerCase()}`;
    eventMap.set(key, ev);
  }
  const mergedEvents = Array.from(eventMap.values()).sort((a, b) => a.minute - b.minute);

  // 2. Hợp nhất Commentary (bảo toàn 100% dòng bình luận/thông báo trận đấu)
  const commMap = new Map<string, MatchCommentaryItem>();
  for (const c of existing.commentary || []) {
    const key = typeof c.sequence === "number"
      ? `seq-${c.sequence}`
      : `${(c.time || "").trim()}-${(c.text || "").trim()}`;
    commMap.set(key, c);
  }
  for (const c of incoming.commentary || []) {
    const key = typeof c.sequence === "number"
      ? `seq-${c.sequence}`
      : `${(c.time || "").trim()}-${(c.text || "").trim()}`;
    commMap.set(key, c);
  }
  const mergedCommentary = Array.from(commMap.values()).sort((a, b) => {
    if (typeof a.sequence === "number" && typeof b.sequence === "number") {
      return a.sequence - b.sequence;
    }
    return 0;
  });

  // 3. Stats: Ưu tiên incoming nếu có dữ liệu, nếu rỗng thì giữ existing
  const stats = incoming.stats && incoming.stats.length > 0 ? incoming.stats : existing.stats;

  // 4. Rosters: Ưu tiên incoming, giữ existing nếu incoming rỗng
  const homeRoster = incoming.homeRoster?.starters?.length
    ? incoming.homeRoster
    : existing.homeRoster;
  const awayRoster = incoming.awayRoster?.starters?.length
    ? incoming.awayRoster
    : existing.awayRoster;

  // 5. Chống tụt lùi đồng hồ và tỷ số nếu snapshot mới bị chậm hơn bản ghi hiện có
  const existingMin = parseClockMinute(existing.displayClock);
  const incomingMin = parseClockMinute(incoming.displayClock);
  const isIncomingOlder = existingMin > incomingMin && incomingMin > 0;

  const displayClock = isIncomingOlder ? existing.displayClock : (incoming.displayClock || existing.displayClock);
  const statusText = isIncomingOlder ? existing.statusText : (incoming.statusText || existing.statusText);

  const homeScore = Math.max(existing.homeTeam?.score ?? 0, incoming.homeTeam?.score ?? 0);
  const awayScore = Math.max(existing.awayTeam?.score ?? 0, incoming.awayTeam?.score ?? 0);

  const homeTeam = {
    ...incoming.homeTeam,
    score: (incoming.homeTeam?.score !== undefined || existing.homeTeam?.score !== undefined) ? homeScore : undefined,
  };
  const awayTeam = {
    ...incoming.awayTeam,
    score: (incoming.awayTeam?.score !== undefined || existing.awayTeam?.score !== undefined) ? awayScore : undefined,
  };

  return {
    ...incoming,
    homeTeam,
    awayTeam,
    events: mergedEvents,
    commentary: mergedCommentary,
    stats,
    homeRoster,
    awayRoster,
    displayClock,
    statusText,
    updatedAt: incoming.updatedAt || new Date().toISOString(),
  };
}
