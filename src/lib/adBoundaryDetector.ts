/**
 * adBoundaryDetector.ts
 *
 * Thuần túy nhận diện ranh giới thời gian (start, end) của các khối segment quảng cáo
 * được chèn bằng segment riêng trong luồng HLS của PhimAPI.
 *
 * ĐẶC BIỆT TUÂN THỦ:
 * 1. Read-only hoàn toàn: Không chỉnh sửa mảng fragments hoặc thuộc tính của Hls.js.
 * 2. 4 tiêu chí đa yếu tố bắt buộc (Multi-factor criteria):
 *    - Ranh giới Discontinuity rõ rệt (thay đổi continuity counter `cc` ở cả hai đầu).
 *    - URL segment khớp mẫu thư mục quảng cáo đã xác minh thực tế từ CDN thượng nguồn.
 *    - Segment liền trước và liền sau KHÔNG khớp mẫu quảng cáo (đối chiếu dị biệt).
 *    - Thời lượng khối nằm trong khoảng an toàn: 10.0s đến 65.0s.
 * 3. Fail-safe: Nếu thiếu dữ liệu hoặc không thỏa mãn đủ 4 tiêu chí, trả về mảng rỗng [].
 */

export interface FragmentLike {
  start?: number;
  duration?: number;
  url?: string;
  relurl?: string;
  sn?: number | string;
  cc?: number;
  [key: string]: unknown;
}

export interface AdBoundary {
  start: number;
  end: number;
  duration: number;
  startIndex: number;
  endIndex: number;
  nextStart?: number;
}

/**
 * Danh sách mẫu đường dẫn quảng cáo đã xác minh thực nghiệm trên các CDN của PhimAPI.
 * TUYỆT ĐỐI KHÔNG mở rộng bừa bãi ra các regex chung chung tránh xóa nhầm nội dung phim.
 *
 * 1. convertv\d+/ (ví dụ: convertv7/vxrUERLE.ts, convertv8/pd18WfS4.ts)
 * 2. /[a-f0-9]{32}/segment_\d+\.ts (ví dụ: /v7/d61a03b1dabe537cc05ffe5c9c280f56/segment_0001.ts)
 */
const VERIFIED_AD_PATH_PATTERNS = [
  /convertv\d+\/[^/\s]+\.ts/i,
  /\/[a-f0-9]{32}\/segment_\d+\.ts/i,
  /\/v\d+\/[a-f0-9]{32}\/segment_\d+\.ts/i,
];

/**
 * Kiểm tra xem một URL segment có khớp với mẫu quảng cáo đã xác minh hay không.
 */
export function isVerifiedAdSegmentUri(uri?: string): boolean {
  if (!uri || typeof uri !== "string") return false;
  return VERIFIED_AD_PATH_PATTERNS.some((pattern) => pattern.test(uri));
}

/**
 * Nhận diện ranh giới các khối quảng cáo từ danh sách fragments của Hls.js.
 */
export function detectAdBoundaries(fragments: FragmentLike[]): AdBoundary[] {
  if (!Array.isArray(fragments) || fragments.length < 2) {
    return [];
  }

  const boundaries: AdBoundary[] = [];
  let i = 0;
  const n = fragments.length;

  while (i < n) {
    const currentFrag = fragments[i];
    const uri = currentFrag.relurl || currentFrag.url || "";

    // 1. Kiểm tra xem segment hiện tại có khớp mẫu quảng cáo đã xác minh hay không
    if (isVerifiedAdSegmentUri(uri)) {
      const startIndex = i;
      let endIndex = i;
      let totalDuration = 0;
      let hasInternalDiscontinuity = false;
      const baseCc = currentFrag.cc;

      // Gom toàn bộ các segment quảng cáo liên tiếp cùng khối
      while (endIndex < n) {
        const candidate = fragments[endIndex];
        const candidateUri = candidate.relurl || candidate.url || "";
        if (!isVerifiedAdSegmentUri(candidateUri)) {
          break;
        }
        if (typeof candidate.cc === "number" && typeof baseCc === "number" && candidate.cc !== baseCc) {
          hasInternalDiscontinuity = true;
        }
        const dur = typeof candidate.duration === "number" && isFinite(candidate.duration) && candidate.duration > 0
          ? candidate.duration
          : 0;
        totalDuration += dur;
        endIndex++;
      }

      const segmentCount = endIndex - startIndex;
      const lastAdFragIndex = endIndex - 1;

      // 2. Tiêu chí 1: Ranh giới Discontinuity
      // Segment quảng cáo đầu tiên phải có sự thay đổi cc so với segment phim liền trước (nếu có)
      const prevFrag = startIndex > 0 ? fragments[startIndex - 1] : null;
      const nextFrag = endIndex < n ? fragments[endIndex] : null;

      const hasStartDiscontinuity =
        startIndex === 0 || // Nếu quảng cáo nằm ngay đầu phim
        (prevFrag !== null && typeof currentFrag.cc === "number" && typeof prevFrag.cc === "number" && currentFrag.cc !== prevFrag.cc);

      // Segment phim liền sau (nếu có) phải có sự thay đổi cc so với segment quảng cáo cuối cùng
      const lastAdFrag = fragments[lastAdFragIndex];
      const hasEndDiscontinuity =
        endIndex === n || // Nếu quảng cáo nằm ở cuối phim
        (nextFrag !== null && typeof nextFrag.cc === "number" && typeof lastAdFrag.cc === "number" && nextFrag.cc !== lastAdFrag.cc);

      // 3. Tiêu chí 2: Đối chiếu dị biệt với segment liền kề
      const prevIsAd = prevFrag ? isVerifiedAdSegmentUri(prevFrag.relurl || prevFrag.url) : false;
      const nextIsAd = nextFrag ? isVerifiedAdSegmentUri(nextFrag.relurl || nextFrag.url) : false;

      // 4. Tiêu chí 3: Giới hạn thời lượng khối quảng cáo (10.0s đến 65.0s)
      const isDurationValid = totalDuration >= 10.0 && totalDuration <= 65.0;

      // Kiểm tra đầy đủ 5 tiêu chí:
      // - Segment count > 0
      // - Discontinuity rõ ràng ở cả 2 đầu
      // - KHÔNG CÓ discontinuity nội bộ (bắt buộc: clip quảng cáo độc lập phải là 1 luồng đơn nhất, không được cắt vụn cc như phim in đè banner)
      // - Segment liền kề không phải là ad
      // - Thời lượng hợp lệ trong khoảng 10.0s đến 65.0s
      if (
        segmentCount > 0 &&
        hasStartDiscontinuity &&
        hasEndDiscontinuity &&
        !hasInternalDiscontinuity &&
        !prevIsAd &&
        !nextIsAd &&
        isDurationValid
      ) {
        const rawStart = typeof currentFrag.start === "number" && isFinite(currentFrag.start) ? currentFrag.start : 0;
        const calculatedEnd = rawStart + totalDuration;
        const rawNextStart = nextFrag && typeof nextFrag.start === "number" && isFinite(nextFrag.start)
          ? nextFrag.start
          : undefined;

        boundaries.push({
          start: Math.max(0, Math.round(rawStart * 1000) / 1000),
          end: Math.max(0, Math.round(calculatedEnd * 1000) / 1000),
          duration: Math.max(0, Math.round(totalDuration * 1000) / 1000),
          startIndex,
          endIndex: lastAdFragIndex,
          ...(rawNextStart !== undefined ? { nextStart: rawNextStart } : {}),
        });
      }

      // Nhảy con trỏ qua khối vừa xét
      i = endIndex;
    } else {
      i++;
    }
  }

  return boundaries;
}

/**
 * Hằng số offset an toàn khi seek vượt qua khối quảng cáo (350ms).
 * Đảm bảo playhead rơi dứt khoát vào segment phim đầu tiên, triệt tiêu 100%
 * việc dính frame cuối hoặc I-frame của segment quảng cáo liền trước.
 */
export const SAFE_AD_SKIP_OFFSET = 0.35;

/**
 * Tính toán mốc seek an toàn vượt qua khối quảng cáo:
 * - Nếu khối quảng cáo có ranh giới `nextStart` (start timestamp chính xác của segment phim liền sau
 *   từ HLS playlist), ưu tiên sử dụng trực tiếp ranh giới segment đã xác minh này (cộng 0.005s vi sai
 *   để triệt tiêu hoàn toàn sai số số thực IEEE-754 giữa các segment và không bị dính ngược vào segment quảng cáo),
 *   tuyệt đối không dùng offset cố định tùy tiện cắt vào nội dung hình/tiếng của phim.
 * - Nếu không có `nextStart`, sử dụng safeOffset (mặc định 0.35s) trên adEnd.
 * - Kiểm tra giới hạn maxDuration: nếu thời lượng phim được cung cấp, không vượt quá (maxDuration - 0.5s).
 * - Xử lý trường hợp có nhiều khối quảng cáo liên tiếp (chaining).
 */
export function calculateSafeAdSkipTarget(
  adEnd: number,
  boundaries?: AdBoundary[],
  maxDuration?: number,
  safeOffset: number = SAFE_AD_SKIP_OFFSET
): number {
  if (!isFinite(adEnd) || adEnd < 0) return 0;

  const matchedAd = Array.isArray(boundaries)
    ? boundaries.find((b) => Math.abs(b.end - adEnd) < 0.05 || (adEnd >= b.start && adEnd <= (b.nextStart ?? b.end)))
    : undefined;

  let target: number;
  if (matchedAd && typeof matchedAd.nextStart === "number" && isFinite(matchedAd.nextStart)) {
    target = Math.max(matchedAd.nextStart, matchedAd.end) + 0.005;
  } else {
    target = Math.max(0, Math.round((adEnd + safeOffset) * 1000) / 1000);
  }

  // Kiểm tra chuỗi quảng cáo liên tiếp (ad chaining)
  if (Array.isArray(boundaries) && boundaries.length > 0) {
    let chained = true;
    let iterations = 0;
    while (chained && iterations < 5) {
      iterations++;
      const nextAd = boundaries.find(
        (b) => target >= b.start && target <= (b.nextStart ?? b.end)
      );
      if (nextAd) {
        if (typeof nextAd.nextStart === "number" && isFinite(nextAd.nextStart)) {
          target = Math.max(nextAd.nextStart, nextAd.end) + 0.005;
        } else {
          target = Math.max(0, Math.round((nextAd.end + safeOffset) * 1000) / 1000);
        }
      } else {
        chained = false;
      }
    }
  }

  // Giới hạn an toàn không vượt quá thời lượng video
  if (typeof maxDuration === "number" && isFinite(maxDuration) && maxDuration > 1) {
    target = Math.min(target, Math.max(0, maxDuration - 0.5));
  }

  return Math.round(target * 1000) / 1000;
}

/**
 * Đánh giá xem một mốc thời gian seek (do tua thủ công hoặc ScrubBar) có rơi vào giữa đoạn quảng cáo nào không.
 * Nếu rơi vào [ad.start, ad.end], trả về mốc thời gian an toàn sau quảng cáo (đã cộng safeOffset và xử lý ad chaining).
 * Nếu không nằm trong quảng cáo, trả về nguyên giá trị targetTime ban đầu.
 */
export function snapTimePastAdBoundaries(
  targetTime: number,
  boundaries?: AdBoundary[],
  maxDuration?: number,
  safeOffset: number = SAFE_AD_SKIP_OFFSET
): {
  snapped: boolean;
  adjustedTime: number;
  adKey: string | null;
  adDuration: number;
} {
  if (
    !Array.isArray(boundaries) ||
    boundaries.length === 0 ||
    !isFinite(targetTime) ||
    targetTime < 0
  ) {
    return { snapped: false, adjustedTime: targetTime, adKey: null, adDuration: 0 };
  }

  const matchedAd = boundaries.find(
    (b) => targetTime >= b.start && targetTime <= (b.nextStart ?? b.end)
  );

  if (!matchedAd) {
    return { snapped: false, adjustedTime: targetTime, adKey: null, adDuration: 0 };
  }

  const safeTarget = calculateSafeAdSkipTarget(matchedAd.end, boundaries, maxDuration, safeOffset);
  return {
    snapped: true,
    adjustedTime: safeTarget,
    adKey: `${matchedAd.start}_${matchedAd.end}`,
    adDuration: Math.round(matchedAd.duration),
  };
}

export interface AutoAdSkipDecision {
  shouldSeek: boolean;
  targetSeek: number;
  adDuration: number;
  adKey: string;
}

/**
 * Đánh giá quyết định tự động seek qua khối quảng cáo đã xác minh ranh giới.
 *
 * NGUYÊN TẮC:
 * 1. Chỉ seek khi currentTime chạm mốc [ad.start - safeLeadTime, ad.end).
 * 2. Không seek nếu video đang pause, ended, hoặc đang trong thao tác seek thủ công.
 * 3. Nếu không có bằng chứng quảng cáo (boundaries rỗng) hoặc không thỏa mãn điều kiện,
 *    trả về null để giữ nguyên playback tự nhiên, tuyệt đối không gián đoạn phim.
 */
export function evaluateAutoAdSkipDecision(params: {
  currentTime: number;
  boundaries: AdBoundary[];
  hasSkippedSet: Set<string>;
  lastSkipTime: number;
  now?: number;
  isPaused?: boolean;
  isEnded?: boolean;
  isSeeking?: boolean;
  leadTime?: number;
  safeOffset?: number;
  maxDuration?: number;
}): AutoAdSkipDecision | null {
  const {
    currentTime: ct,
    boundaries,
    hasSkippedSet,
    lastSkipTime,
    now = Date.now(),
    isPaused = false,
    isEnded = false,
    isSeeking = false,
    leadTime = 0,
    safeOffset = 0,
    maxDuration,
  } = params;

  if (isPaused || isEnded || isSeeking || !Array.isArray(boundaries) || boundaries.length === 0) {
    return null;
  }

  // leadTime tối đa an toàn không vượt quá 0.5s và không vượt quá khoảng cách tua lùi (2s)
  const safeLeadTime = Math.max(0, Math.min(0.5, leadTime));

  for (const ad of boundaries) {
    const adKey = `${ad.start}_${ad.end}`;
    if (ct < ad.start - 2) {
      // Khôi phục quyền skip nếu người dùng tua lùi lại trước mốc quảng cáo
      hasSkippedSet.delete(adKey);
    } else if (
      ct >= ad.start - safeLeadTime &&
      ct < (ad.nextStart ?? ad.end) &&
      !hasSkippedSet.has(adKey) &&
      now - lastSkipTime > 2000
    ) {
      hasSkippedSet.add(adKey);
      const targetSeek = safeOffset > 0 || ad.nextStart !== undefined
        ? calculateSafeAdSkipTarget(ad.end, boundaries, maxDuration, safeOffset)
        : ad.end;

      return {
        shouldSeek: true,
        targetSeek,
        adDuration: Math.round(ad.duration),
        adKey,
      };
    }
  }

  return null;
}

export interface PreRollAdDecision {
  shouldSkipPreRoll: boolean;
  targetSeek: number;
  adDuration: number;
  adKey: string;
}

/**
 * Đánh giá quyết định tự động bỏ qua khối quảng cáo pre-roll (quảng cáo ở đầu video)
 * TRƯỚC KHI video bắt đầu phát lần đầu tiên (TC-AD-SKIP: P0).
 *
 * Chỉ kích hoạt khi:
 * 1. Playback chưa bắt đầu (hasStartedInitialPlayback === false).
 * 2. Người xem bắt đầu từ đầu tập (targetProgress === 0).
 * 3. Khối quảng cáo đầu tiên bắt đầu tại mốc 0 hoặc cận 0 (start <= startThreshold, mặc định 0.5s).
 */
export function evaluatePreRollAdDecision(params: {
  targetProgress: number;
  hasStartedInitialPlayback: boolean;
  boundaries: AdBoundary[];
  startThreshold?: number;
  safeOffset?: number;
  maxDuration?: number;
}): PreRollAdDecision | null {
  const {
    targetProgress,
    hasStartedInitialPlayback,
    boundaries,
    startThreshold = 0.5,
    safeOffset = 0,
    maxDuration,
  } = params;

  if (hasStartedInitialPlayback || targetProgress > 0 || !Array.isArray(boundaries) || boundaries.length === 0) {
    return null;
  }

  const firstAd = boundaries[0];
  if (firstAd && typeof firstAd.start === "number" && firstAd.start <= startThreshold && firstAd.end > firstAd.start) {
    const targetSeek = safeOffset > 0 || firstAd.nextStart !== undefined
      ? calculateSafeAdSkipTarget(firstAd.end, boundaries, maxDuration, safeOffset)
      : firstAd.end;

    return {
      shouldSkipPreRoll: true,
      targetSeek,
      adDuration: Math.round(firstAd.duration),
      adKey: `${firstAd.start}_${firstAd.end}`,
    };
  }

  return null;
}


