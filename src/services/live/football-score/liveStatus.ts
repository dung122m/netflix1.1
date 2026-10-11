import { LiveMatchScore } from "./types";

/**
 * Kiểm tra timestamp kickoff có hợp lệ từ dữ liệu nguồn hay không:
 * - Phải là kiểu number hữu hạn dương
 * - Không phải giá trị sentinel Number.MAX_SAFE_INTEGER
 * - Parse được thành ngày giờ hợp lệ
 */
export function isValidKickoffTimestamp(timestamp?: number | null): boolean {
  if (
    timestamp === undefined ||
    timestamp === null ||
    typeof timestamp !== "number" ||
    !Number.isFinite(timestamp) ||
    timestamp <= 0 ||
    timestamp === Number.MAX_SAFE_INTEGER
  ) {
    return false;
  }
  const d = new Date(timestamp);
  return !isNaN(d.getTime());
}

/**
 * Định dạng giờ đá theo múi giờ Asia/Ho_Chi_Minh (HH:mm)
 * Xử lý nhất quán cả UTC timestamp và các trận qua nửa đêm theo giờ Việt Nam
 */
export function formatKickoffTime(timestamp?: number | null): string | null {
  if (!isValidKickoffTimestamp(timestamp)) {
    return null;
  }
  try {
    const d = new Date(timestamp!);
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(d);
  } catch {
    return null;
  }
}

export interface MatchSpecialStatus {
  isSpecial: boolean;
  label: string;
  detail?: string;
}

/**
 * Nhận diện trạng thái đặc biệt: Hoãn, Hủy, Tạm hoãn, Gián đoạn từ dữ liệu nguồn và livescore
 */
export function getMatchSpecialStatus(
  score?: LiveMatchScore | null,
  sourceStatus?: string,
): MatchSpecialStatus | null {
  const detail = (score?.statusDetail || "").toLowerCase();
  const src = (sourceStatus || "").toLowerCase();

  if (
    detail.includes("postponed") ||
    detail.includes("hoãn") ||
    src.includes("hoãn")
  ) {
    return { isSpecial: true, label: "Hoãn", detail: score?.statusDetail || "Hoãn" };
  }

  if (
    detail.includes("cancel") ||
    detail.includes("hủy") ||
    src.includes("hủy")
  ) {
    return { isSpecial: true, label: "Hủy", detail: score?.statusDetail || "Hủy" };
  }

  if (
    detail.includes("suspended") ||
    detail.includes("interrupted") ||
    detail.includes("gián đoạn") ||
    detail.includes("abandoned") ||
    src.includes("abandoned")
  ) {
    return { isSpecial: true, label: "Tạm hoãn", detail: score?.statusDetail || "Tạm hoãn" };
  }

  if (detail.includes("delayed") || src.includes("delayed")) {
    return { isSpecial: true, label: "Trì hoãn", detail: score?.statusDetail || "Trì hoãn" };
  }

  return null;
}

export type MatchDisplayStatusType =
  | "live"
  | "upcoming"
  | "finished"
  | "postponed"
  | "canceled"
  | "suspended"
  | "safe_idle";

export interface MatchDisplayStatusResult {
  isConfirmedLive: boolean;
  statusType: MatchDisplayStatusType;
  badgeLabel: string | null;
  kickoffTime: string | null;
  statusDetail?: string;
  displayClock?: string;
}

/**
 * Logic trung tâm kiểm soát nhãn "Đang phát trực tiếp" và trạng thái hiển thị của trận đấu:
 * 1. Phải có giờ kickoff hợp lệ từ dữ liệu nguồn (không tự tạo khi thiếu).
 * 2. Chỉ hiển thị nhãn LIVE khi kickoff hợp lệ VÀ dữ liệu livescore xác nhận status === "live".
 *    Tuyệt đối không dùng riêng match.timeline === "live" hoặc URL stream để suy đoán live.
 * 3. Trạng thái chưa đá, kết thúc (FT), hoãn, hủy hoặc thiếu timestamp được hiển thị chính xác.
 */
export function resolveMatchDisplayStatus(params: {
  timestamp?: number | null;
  score?: LiveMatchScore | null;
  sourceStatus?: string;
  now?: number;
}): MatchDisplayStatusResult {
  const { timestamp, score, sourceStatus } = params;

  const scoreTsValid = isValidKickoffTimestamp(score?.kickoffTimestamp);
  const m3uTsValid = isValidKickoffTimestamp(timestamp);
  const effectiveTimestamp = scoreTsValid ? score!.kickoffTimestamp : m3uTsValid ? timestamp : null;
  const validKickoff = effectiveTimestamp !== null;
  const kickoffTime = (scoreTsValid && score?.kickoffTime) ? score.kickoffTime : formatKickoffTime(effectiveTimestamp);

  // 1. Kiểm tra trạng thái hoãn, hủy, tạm hoãn
  const special = getMatchSpecialStatus(score, sourceStatus);
  if (special) {
    return {
      isConfirmedLive: false,
      statusType:
        special.label === "Hủy"
          ? "canceled"
          : special.label === "Tạm hoãn"
          ? "suspended"
          : "postponed",
      badgeLabel: special.label,
      kickoffTime,
      statusDetail: special.detail,
    };
  }

  // 2. Kiểm tra trận đã kết thúc (finished)
  const isFinished = Boolean(
    score?.status === "finished" ||
    sourceStatus === "finished"
  );
  if (isFinished) {
    return {
      isConfirmedLive: false,
      statusType: "finished",
      badgeLabel: "FT",
      kickoffTime,
      statusDetail: score?.statusDetail || "FT",
      displayClock: score?.displayClock || "FT",
    };
  }

  // 3. Xác nhận LIVE: Bắt buộc có giờ kickoff hợp lệ VÀ livescore xác nhận đang diễn ra
  if (validKickoff && score?.status === "live") {
    const clock = score.displayClock ? `LIVE ${score.displayClock}` : "LIVE";
    return {
      isConfirmedLive: true,
      statusType: "live",
      badgeLabel: clock,
      kickoffTime,
      statusDetail: score.statusDetail,
      displayClock: score.displayClock,
    };
  }

  // 4. Nếu chưa live hoặc livescore không xác nhận live:
  // - Nếu có giờ đá hợp lệ: hiển thị sắp diễn ra cùng giờ đá, tuyệt đối không gắn nhãn live
  if (validKickoff) {
    return {
      isConfirmedLive: false,
      statusType: "upcoming",
      badgeLabel: null,
      kickoffTime,
      statusDetail: score?.statusDetail,
    };
  }

  // 5. Thiếu giờ đá hoặc timestamp không hợp lệ:
  // - Giữ trạng thái an toàn hiện có, tuyệt đối không tự suy đoán live
  return {
    isConfirmedLive: false,
    statusType: "safe_idle",
    badgeLabel: null,
    kickoffTime: null,
  };
}
