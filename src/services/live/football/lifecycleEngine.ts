/**
 * ADAPTIVE HYBRID EVENT LIFECYCLE ENGINE
 *
 * Quản lý vòng đời trận đấu thể thao đa tầng tự thích ứng:
 * 1. Không dùng ngưỡng thời gian cố định (hardcoded duration) để tự tiện kết thúc trận đấu.
 * 2. Phân loại theo 3 nguồn tín hiệu độc lập:
 *    - Event Status (Livescore API: 1H, 2H, HT, ET, PEN, FT, Postponed, Suspended)
 *    - Stream Status (HLS Manifest Health: ACTIVE, INACTIVE, DEGRADED, UNKNOWN)
 *    - Listing Status (Upstream Channel Discovery: LISTED, UNLISTED)
 * 3. Bảo vệ trận đấu có hiệp phụ, luân lưu, tennis 5 set, esports BO5 kéo dài.
 * 4. Ngăn chặn hiện tượng zombie stream kéo ngược trận đã FT thành LIVE.
 */

import { LiveMatchScore } from "@/services/live/football-score/types";

// =========================================================================
// 1. ĐỊNH NGHĨA TRẠNG THÁI ĐỘC LẬP (DISCRETE STATUS TYPES)
// =========================================================================

export type EventStatus =
  | "SCHEDULED"   // Chưa bắt đầu
  | "LIVE"        // Đang thi đấu chính thức
  | "HALFTIME"    // Nghỉ giữa hiệp (HT)
  | "EXTRA_TIME"  // Đang đá hiệp phụ (ET)
  | "PENALTIES"   // Đang sút luân lưu (PEN)
  | "SUSPENDED"   // Tạm hoãn (thời tiết, sự cố kỹ thuật)
  | "POSTPONED"   // Hoãn lịch thi đấu
  | "FINISHED"    // Đã kết thúc chính thức (FT, AET, PEN_FT)
  | "CANCELLED"   // Đã hủy bỏ
  | "UNKNOWN";    // Chưa xác định

export type StreamStatus =
  | "ACTIVE"      // Stream HTTP 200, HLS manifest có segment mới
  | "INACTIVE"    // Stream chết (404, 5xx, host không phản hồi)
  | "DEGRADED"    // Stream chập chờn / timeout
  | "UNKNOWN";    // Chưa kiểm tra / đang kiểm tra ngầm

export type ListingStatus =
  | "LISTED"      // Upstream đang gắn cờ LIVE / có trong danh mục phát sóng
  | "UNLISTED"    // Upstream đã gỡ khỏi trang chủ / cờ finished
  | "UNKNOWN";

export type EvaluationConfidence =
  | "authoritative" // Nguồn dữ liệu livescore hoặc nhà đài xác nhận chính thức
  | "high"          // Stream health và cờ upstream thống nhất
  | "inferred"      // Suy luận dựa trên thời gian bắt đầu và tín hiệu sẵn có
  | "uncertain"     // Tín hiệu mâu thuẫn hoặc thiếu dữ liệu, đang trong thời gian theo dõi
  | "stale";        // Dữ liệu cũ cần refresh

export interface LifecycleEvaluation {
  eventStatus: EventStatus;
  streamStatus: StreamStatus;
  listingStatus: ListingStatus;
  displayTimeline: "live" | "upcoming" | "finished";
  isLiveInWindow: boolean;
  confidence: EvaluationConfidence;
  reason: string;
  statusBadge: string | null;
}

export type SportCategory =
  | "football"
  | "esports"
  | "tennis"
  | "basketball"
  | "volleyball"
  | "billiards"
  | "motorsport"
  | "other";

// =========================================================================
// 2. CẤU HÌNH NGƯỠNG AN TOÀN VÀ CỬA SỔ THEO BỘ MÔN (SAFETY CEILINGS)
// =========================================================================

/**
 * Ngưỡng an toàn tuyệt đối (Safety Ceiling) chỉ dùng để phát hiện bất thường / stream zombie:
 * - KHÔNG PHẢI điều kiện kết thúc trận bình thường.
 * - Trận đấu có stream sống và livescore live sẽ KHÔNG bao giờ bị kết thúc sớm trước ngưỡng này.
 */
export const SPORT_SAFETY_CEILINGS_MS: Record<SportCategory, number> = {
  football: 210 * 60 * 1000,   // 3.5 giờ (bao quát trọn vẹn 90m + 30m ET + Pen + bù giờ + gián đoạn)
  esports: 8 * 60 * 60 * 1000,  // 8 giờ (bao quát trọn vẹn BO5 + pause/remake + trao giải)
  tennis: 6 * 60 * 60 * 1000,   // 6 giờ (bao quát Grand Slam 5 set lịch sử)
  basketball: 4 * 60 * 60 * 1000, // 4 giờ (bao quát nhiều hiệp phụ OT1, OT2, OT3)
  volleyball: 4 * 60 * 60 * 1000,
  billiards: 8 * 60 * 60 * 1000,
  motorsport: 5 * 60 * 60 * 1000,
  other: 8 * 60 * 60 * 1000,
};

/**
 * Thời lượng tiêu chuẩn thông thường (Normal Match Duration):
 * - Trong khoảng thời gian này: Một khi đã tới giờ bắt đầu, trận đấu mặc định là LIVE.
 * - Sau khoảng thời gian này: Kích hoạt chế độ kiểm tra nhịp thở stream (Heartbeat check).
 */
export const SPORT_NORMAL_DURATION_MS: Record<SportCategory, number> = {
  football: 105 * 60 * 1000,   // 105 phút (90m + 15m nghỉ)
  esports: 180 * 60 * 1000,    // 180 phút
  tennis: 150 * 60 * 1000,     // 150 phút
  basketball: 135 * 60 * 1000, // 135 phút
  volleyball: 120 * 60 * 1000,
  billiards: 180 * 60 * 1000,
  motorsport: 180 * 60 * 1000,
  other: 140 * 60 * 1000,
};

export const UPCOMING_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 giờ hiển thị trước trận

// =========================================================================
// 3. CHUẨN HÓA THỂ THAO VÀ TÍN HIỆU
// =========================================================================

export function normalizeSportCategory(sport?: string): SportCategory {
  if (!sport) return "football";
  const s = sport.toLowerCase().trim();
  if (s.includes("esport") || s.includes("điện tử") || s.includes("lol") || s.includes("dota") || s.includes("cs")) return "esports";
  if (s.includes("tennis") || s.includes("quần vợt")) return "tennis";
  if (s.includes("basket") || s.includes("bóng rổ")) return "basketball";
  if (s.includes("volley") || s.includes("bóng chuyền")) return "volleyball";
  if (s.includes("billiard") || s.includes("bida") || s.includes("snooker")) return "billiards";
  if (s.includes("f1") || s.includes("motor") || s.includes("đua xe")) return "motorsport";
  if (s.includes("football") || s.includes("bóng đá") || s.includes("soccer")) return "football";
  return "other";
}

// =========================================================================
// 4. BỘ MÁY ĐIỀU PHỐI VÒNG ĐỜI HYBRID (ADAPTIVE LIFECYCLE EVALUATOR)
// =========================================================================

export interface EvaluateLifecycleParams {
  timestamp?: number | null;
  score?: LiveMatchScore | null;
  sourceStatus?: string | boolean;
  streamHealth?: "alive" | "dead" | "unknown";
  now?: number;
  sport?: string;
  isEvent?: boolean;
}

export function evaluateEventLifecycle(params: EvaluateLifecycleParams): LifecycleEvaluation {
  const now = params.now ?? Date.now();
  const sportCat = normalizeSportCategory(params.sport);
  const isEvent = Boolean(params.isEvent);
  const score = params.score;
  const streamHealth = params.streamHealth ?? "unknown";

  // A. Chuẩn hóa Stream Status
  const streamStatus: StreamStatus =
    streamHealth === "alive" ? "ACTIVE" : streamHealth === "dead" ? "INACTIVE" : "UNKNOWN";

  // B. Chuẩn hóa Listing Status từ Upstream
  let listingStatus: ListingStatus = "UNKNOWN";
  const rawSrc = typeof params.sourceStatus === "boolean"
    ? (params.sourceStatus ? "live" : "unknown")
    : (params.sourceStatus || "").toLowerCase();

  if (rawSrc === "live" || rawSrc.includes("live") || rawSrc.includes("đang diễn ra")) {
    listingStatus = "LISTED";
  } else if (rawSrc === "finished" || rawSrc.includes("kết thúc") || rawSrc.includes("ended")) {
    listingStatus = "UNLISTED";
  }

  // C. Kiểm tra Timestamp hợp lệ
  const hasValidTimestamp =
    params.timestamp !== undefined &&
    params.timestamp !== null &&
    params.timestamp > 0 &&
    params.timestamp !== Number.MAX_SAFE_INTEGER;

  const kickoff = hasValidTimestamp ? params.timestamp! : null;
  const elapsedMs = kickoff ? now - kickoff : null;

  // =======================================================================
  // QUY TẮC 1: TÍN HIỆU CHÍNH THỐNG TỪ LIVESCORE (AUTHORITATIVE LIVESCORE)
  // =======================================================================
  if (score && score.status) {
    const rawStatusText = (score as unknown as { statusText?: string }).statusText || "";
    const rawDetail = `${rawStatusText} ${score.statusDetail || ""} ${score.displayClock || ""}`.toLowerCase();

    // 1A. Trận đã kết thúc chính thức (FT, AET, PEN_FT, Finished, Abandoned)
    // Dùng word boundary hoặc regex để tránh nhầm "halftime" (chứa 'ft') thành FT
    const isExplicitFT =
      score.status === "finished" ||
      /\bft\b/i.test(rawDetail) ||
      /\bfull[\s-]?time\b/i.test(rawDetail) ||
      /\bfinal\b/i.test(rawDetail) ||
      /\baet\b/i.test(rawDetail) ||
      rawDetail.includes("pen_ft") ||
      rawDetail.includes("kết thúc");

    if (isExplicitFT) {
      return {
        eventStatus: "FINISHED",
        streamStatus,
        listingStatus,
        displayTimeline: "finished",
        isLiveInWindow: false,
        confidence: "authoritative",
        reason: "Livescore API xác nhận trận đã kết thúc (Full-time / Finished)",
        statusBadge: "FT",
      };
    }

    // 1B. Trận bị Tạm dừng (Suspended) - Kiểm tra TRƯỚC Hoãn vì "tạm hoãn" chứa chữ "hoãn"
    if (
      rawDetail.includes("suspended") ||
      rawDetail.includes("interrupted") ||
      rawDetail.includes("tạm hoãn") ||
      rawDetail.includes("tạm dừng")
    ) {
      return {
        eventStatus: "SUSPENDED",
        streamStatus,
        listingStatus,
        displayTimeline: "live", // Giữ an toàn hiển thị để khán giả theo dõi tình hình
        isLiveInWindow: true,
        confidence: "authoritative",
        reason: "Trận đấu đang tạm hoãn do thời tiết hoặc sự cố kỹ thuật",
        statusBadge: "Tạm hoãn",
      };
    }

    // 1C. Trận bị Hoãn (Postponed) hoặc Hủy (Cancelled)
    if (rawDetail.includes("postponed") || rawDetail.includes("hoãn")) {
      return {
        eventStatus: "POSTPONED",
        streamStatus,
        listingStatus,
        displayTimeline: "upcoming",
        isLiveInWindow: false,
        confidence: "authoritative",
        reason: "Livescore báo trận đấu bị hoãn (Postponed)",
        statusBadge: "Hoãn",
      };
    }
    if (rawDetail.includes("cancel") || rawDetail.includes("hủy")) {
      return {
        eventStatus: "CANCELLED",
        streamStatus,
        listingStatus,
        displayTimeline: "finished",
        isLiveInWindow: false,
        confidence: "authoritative",
        reason: "Trận đấu đã bị hủy bỏ (Cancelled)",
        statusBadge: "Hủy",
      };
    }

    // 1C. Đang đá luân lưu / Penalty Shootout
    if (
      rawDetail.includes("shootout") ||
      rawDetail.includes("penalties") ||
      rawDetail.includes("pen") ||
      rawStatusText === "STATUS_SHOOTOUT"
    ) {
      return {
        eventStatus: "PENALTIES",
        streamStatus,
        listingStatus,
        displayTimeline: "live",
        isLiveInWindow: true,
        confidence: "authoritative",
        reason: "Trận đấu đang bước vào loạt sút luân lưu (Penalty Shootout)",
        statusBadge: "PEN",
      };
    }

    // 1D. Đang đá hiệp phụ / Extra Time (Overtime)
    if (
      rawDetail.includes("overtime") ||
      rawDetail.includes("extra time") ||
      rawDetail.includes("et") ||
      rawStatusText === "STATUS_OVERTIME"
    ) {
      return {
        eventStatus: "EXTRA_TIME",
        streamStatus,
        listingStatus,
        displayTimeline: "live",
        isLiveInWindow: true,
        confidence: "authoritative",
        reason: "Trận đấu đang thi đấu 2 hiệp phụ (Extra Time)",
        statusBadge: "ET",
      };
    }

    // 1E. Nghỉ giữa hiệp (Halftime)
    if (
      rawDetail.includes("halftime") ||
      rawDetail.includes("ht") ||
      rawStatusText === "STATUS_HALFTIME"
    ) {
      return {
        eventStatus: "HALFTIME",
        streamStatus,
        listingStatus,
        displayTimeline: "live",
        isLiveInWindow: true,
        confidence: "authoritative",
        reason: "Trận đấu đang nghỉ giữa hiệp (Halftime)",
        statusBadge: "HT",
      };
    }

    // 1F. Đang thi đấu bình thường (1H, 2H, Live)
    if (score.status === "live") {
      return {
        eventStatus: "LIVE",
        streamStatus,
        listingStatus,
        displayTimeline: "live",
        isLiveInWindow: true,
        confidence: "authoritative",
        reason: "Livescore API xác nhận trận đang thi đấu trực tiếp",
        statusBadge: score.displayClock ? `${score.displayClock}'` : "LIVE",
      };
    }
  }

  // =======================================================================
  // QUY TẮC 2: XÁC NHẬN RÕ RÀNG TỪ NGUỒN PHÁT UPSTREAM
  // =======================================================================
  if (listingStatus === "UNLISTED") {
    // Upstream đã gỡ hoặc đánh dấu đã kết thúc -> FINISHED
    return {
      eventStatus: "FINISHED",
      streamStatus,
      listingStatus,
      displayTimeline: "finished",
      isLiveInWindow: false,
      confidence: "high",
      reason: "Nguồn phát upstream đã gỡ trận hoặc đánh dấu kết thúc",
      statusBadge: "FT",
    };
  }

  // =======================================================================
  // QUY TẮC 3: KIỂM TRA THỜI GIAN KICKOFF TRONG TƯƠNG LAI (CHƯA ĐẾN GIỜ ĐÁ)
  // =======================================================================
  if (hasValidTimestamp && elapsedMs !== null && elapsedMs < 0) {
    const timeUntilKickoff = -elapsedMs;

    // Ngoại lệ: Sát giờ thi đấu (<= 5 phút) và luồng stream hoặc upstream đã mở sớm
    if (timeUntilKickoff <= 5 * 60 * 1000 && (streamStatus === "ACTIVE" || listingStatus === "LISTED")) {
      return {
        eventStatus: "LIVE",
        streamStatus,
        listingStatus,
        displayTimeline: "live",
        isLiveInWindow: true,
        confidence: "high",
        reason: "Trận đấu phát sóng sớm trước giờ bóng lăn (<= 5 phút)",
        statusBadge: "LIVE",
      };
    }

    // Chưa đến giờ thi đấu -> SCHEDULED / UPCOMING
    const inWindow = timeUntilKickoff <= UPCOMING_WINDOW_MS;
    return {
      eventStatus: "SCHEDULED",
      streamStatus,
      listingStatus,
      displayTimeline: "upcoming",
      isLiveInWindow: inWindow,
      confidence: "high",
      reason: "Trận đấu chưa đến giờ bắt đầu (Kickoff in future)",
      statusBadge: null,
    };
  }

  // =======================================================================
  // QUY TẮC 4: THÍCH ỨNG ĐA TẦNG CHO TRẬN ĐANG/ĐÃ DIỄN RA (ADAPTIVE FALLBACK)
  // =======================================================================
  if (hasValidTimestamp && elapsedMs !== null && elapsedMs >= 0) {
    const normalDuration = params.sport
      ? SPORT_NORMAL_DURATION_MS[sportCat]
      : 140 * 60 * 1000;
    const safetyCeiling = isEvent
      ? SPORT_SAFETY_CEILINGS_MS.other
      : params.sport
      ? SPORT_SAFETY_CEILINGS_MS[sportCat]
      : 140 * 60 * 1000;

    // 4A. VƯỢT NGƯỠNG AN TOÀN TUYỆT ĐỐI (SAFETY CEILING CHECK)
    // Chỉ kích hoạt khi thời gian quá lớn (ví dụ bóng đá > 210 phút, esports > 8 giờ)
    // Tránh tình trạng stream treo vô hạn (Zombie stream bỏ quên máy phát)
    if (elapsedMs > safetyCeiling) {
      return {
        eventStatus: "FINISHED",
        streamStatus,
        listingStatus,
        displayTimeline: "finished",
        isLiveInWindow: false,
        confidence: "inferred",
        reason: `Vượt quá ngưỡng an toàn tối đa của bộ môn (${Math.round(safetyCeiling / (60 * 1000))}m) - ngắt stream bất thường`,
        statusBadge: "FT",
      };
    }

    // 4B. TRONG GIAI ĐOẠN TIÊU CHUẨN (0 -> normalDuration)
    // Ví dụ: Bóng đá trong 105 phút đầu, Esports trong 180 phút đầu
    if (elapsedMs <= normalDuration) {
      if (streamStatus === "INACTIVE" && listingStatus !== "LISTED") {
        // Stream chết hẳn và không còn list -> FINISHED
        return {
          eventStatus: "FINISHED",
          streamStatus,
          listingStatus,
          displayTimeline: "finished",
          isLiveInWindow: false,
          confidence: "high",
          reason: "Toàn bộ luồng stream đã ngắt kết nối trong giờ thi đấu",
          statusBadge: "FT",
        };
      }

      return {
        eventStatus: "LIVE",
        streamStatus,
        listingStatus,
        displayTimeline: "live",
        isLiveInWindow: true,
        confidence: "high",
        reason: "Trận đấu đang diễn ra trong khung thời gian tiêu chuẩn",
        statusBadge: "LIVE",
      };
    }

    // 4C. GIAI ĐOẠN CO GIÃN LINH HOẠT (FLEXIBLE / OVERTIME / PENALTY WINDOW)
    // Ví dụ: Bóng đá từ phút 105 đến 210 phút (Hiệp phụ, luân lưu, bù giờ dài)
    // Esports từ 180 đến 480 phút (BO5 giằng co, tạm dừng kỹ thuật)
    // Tennis từ 150 đến 360 phút (5 set giằng co)
    if (elapsedMs > normalDuration && elapsedMs <= safetyCeiling) {
      // NGUYÊN TẮC CỐT LÕI:
      // Chừng nào luồng stream VẪN ĐANG PHÁT (streamStatus === "ACTIVE")
      // HOẶC nguồn upstream vẫn gắn nhãn LISTED:
      // -> TRẬN ĐẤU VẪN TIẾP TỤC ĐƯỢC GIỮ LIVE 100%!
      if (streamStatus === "ACTIVE" || listingStatus === "LISTED") {
        const badge = sportCat === "football" && elapsedMs > 120 * 60 * 1000 ? "ET" : "LIVE";
        return {
          eventStatus: badge === "ET" ? "EXTRA_TIME" : "LIVE",
          streamStatus,
          listingStatus,
          displayTimeline: "live",
          isLiveInWindow: true,
          confidence: "high",
          reason: `Trận đấu kéo dài (hiệp phụ/luân lưu/overtime) nhưng luồng phát vẫn đang hoạt động tích cực (${Math.round(elapsedMs / (60 * 1000))}m)`,
          statusBadge: badge,
        };
      }

      // Nếu stream đã xác nhận ngắt (INACTIVE) HOẶC không có bằng chứng stream sống:
      // Kết thúc trận đấu an toàn, không giữ nhầm trận 90 phút đã đá xong!
      return {
        eventStatus: "FINISHED",
        streamStatus,
        listingStatus,
        displayTimeline: "finished",
        isLiveInWindow: false,
        confidence: "inferred",
        reason: `Trận đấu quá thời gian tiêu chuẩn (${Math.round(elapsedMs / (60 * 1000))}m) và luồng stream đã kết thúc`,
        statusBadge: "FT",
      };
    }
  }

  // =======================================================================
  // QUY TẮC 5: SỰ KIỆN KHÔNG CÓ TIMESTAMP CỐ ĐỊNH (24/7 HOẶC SỰ KIỆN ĐẶC BIỆT)
  // =======================================================================
  if (!hasValidTimestamp) {
    if (listingStatus === "LISTED" || (isEvent && streamStatus === "ACTIVE")) {
      return {
        eventStatus: "LIVE",
        streamStatus,
        listingStatus,
        displayTimeline: "live",
        isLiveInWindow: true,
        confidence: "inferred",
        reason: "Sự kiện trực tiếp không có mốc thời gian nhưng nguồn phát đang hoạt động",
        statusBadge: "LIVE",
      };
    }
  }

  // Fallback mặc định an toàn
  return {
    eventStatus: "FINISHED",
    streamStatus,
    listingStatus,
    displayTimeline: "finished",
    isLiveInWindow: false,
    confidence: "uncertain",
    reason: "Không có đủ bằng chứng xác thực trận đấu đang phát sóng",
    statusBadge: "FT",
  };
}
