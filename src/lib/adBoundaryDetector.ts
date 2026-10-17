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

      // Gom toàn bộ các segment quảng cáo liên tiếp cùng khối
      while (endIndex < n) {
        const candidate = fragments[endIndex];
        const candidateUri = candidate.relurl || candidate.url || "";
        if (!isVerifiedAdSegmentUri(candidateUri)) {
          break;
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

      // Kiểm tra đầy đủ 4 tiêu chí
      if (
        segmentCount > 0 &&
        hasStartDiscontinuity &&
        hasEndDiscontinuity &&
        !prevIsAd &&
        !nextIsAd &&
        isDurationValid
      ) {
        const rawStart = typeof currentFrag.start === "number" && isFinite(currentFrag.start) ? currentFrag.start : 0;
        const calculatedEnd = rawStart + totalDuration;

        boundaries.push({
          start: Math.max(0, Math.round(rawStart * 1000) / 1000),
          end: Math.max(0, Math.round(calculatedEnd * 1000) / 1000),
          duration: Math.max(0, Math.round(totalDuration * 1000) / 1000),
          startIndex,
          endIndex: lastAdFragIndex,
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
