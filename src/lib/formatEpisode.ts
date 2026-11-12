const FULL_EPISODE_LABEL_REGEX = /^(?:(?:tập|tap|bản|ban)\s*[:.-]?\s*)?full$/i;

/**
 * Kiểm tra xem tên tập phim có phải là nhãn phim lẻ ("Full", "FULL", "Tập Full", "Tập FULL", "Bản Full") hay không
 */
export function isFullEpisodeLabel(name?: string): boolean {
  if (!name) return false;
  return FULL_EPISODE_LABEL_REGEX.test(name.trim());
}

/**
 * Chuẩn hóa và định dạng tên tập phim an toàn, chống triệt để lỗi lặp từ như "Tập Tập 01"
 * và thống nhất các biến thể "FULL", "Full", "Tập FULL", "Tập Full" -> "Bản Full"
 */
export function formatEpisodeName(name?: string, fallback = "Tập 1"): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;

  // Chuẩn hóa mọi biến thể của bản Full ("Full", "FULL", "Tập FULL", "Tập Full", "Bản FULL"...)
  if (isFullEpisodeLabel(trimmed)) {
    return "Bản Full";
  }

  // Nếu tên tập đã bắt đầu bằng chữ "Tập" hoặc "tap" (ví dụ: "Tập 01", "Tập 12")
  if (/^tập\s*/i.test(trimmed)) {
    return trimmed;
  }

  // Nếu chỉ là số (ví dụ: "01", "1", "15")
  if (/^\d+$/.test(trimmed)) {
    return `Tập ${trimmed}`;
  }

  return `Tập ${trimmed}`;
}

/**
 * Tìm tập phim khớp thông minh từ URL param hoặc query (xử lý tap-8, tap-08, 8, tap-full)
 */
export function findEpisodeMatch<T extends { slug?: string; name?: string }>(
  episodes: T[],
  target?: string
): T | undefined {
  if (!target || !episodes || episodes.length === 0) return undefined;
  const t = target.trim().toLowerCase();

  // 1. So khớp chính xác slug hoặc name
  const exact = episodes.find((e) => (e.slug || "").toLowerCase() === t || (e.name || "").toLowerCase() === t);
  if (exact) return exact;

  // 2. Chuẩn hóa bỏ tiền tố "tap-", "tap ", "ep-"
  const cleanTarget = t.replace(/^(tap|ep)[-_\s]*/i, "").trim();

  // So khớp chính xác sau khi bỏ tiền tố tap- (ví dụ: target="tap-1049", cleanTarget="1049")
  const cleanExact = episodes.find((e) => {
    const slugClean = (e.slug || "").toLowerCase().replace(/^(tap|ep)[-_\s]*/i, "").trim();
    const nameClean = (e.name || "").toLowerCase().replace(/^(tap|ep)[-_\s]*/i, "").trim();
    return slugClean === cleanTarget || nameClean === cleanTarget;
  });
  if (cleanExact) return cleanExact;

  // 3. So khớp số học nguyên vẹn (chống lỗi 1049 vô tình khớp nhầm 1049-2, xử lý tap-2 <-> tap-02)
  if (/^\d+$/.test(cleanTarget)) {
    const targetNum = parseInt(cleanTarget, 10);
    const numMatch = episodes.find((e) => {
      const slugClean = (e.slug || "").toLowerCase().replace(/^(tap|ep)[-_\s]*/i, "").trim();
      const nameClean = (e.name || "").toLowerCase().replace(/^(tap|ep)[-_\s]*/i, "").trim();
      if (/^\d+$/.test(slugClean) && parseInt(slugClean, 10) === targetNum) return true;
      if (/^\d+$/.test(nameClean) && parseInt(nameClean, 10) === targetNum) return true;
      return false;
    });
    if (numMatch) return numMatch;
  }

  // 4. So khớp tập đôi/tập ba hoặc dải số (ví dụ: "39" hoặc "40" khớp "tap-39-40", "267" khớp "tap-266-267-268")
  const targetNumbers = (cleanTarget.match(/\d+/g) || []).map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
  if (targetNumbers.length > 0) {
    if (targetNumbers.length === 1) {
      const singleTarget = targetNumbers[0];
      const rangeMatch = episodes.find((e) => {
        const slugClean = (e.slug || "").toLowerCase().replace(/^(tap|ep)[-_\s]*/i, "").trim();
        const epNums = (slugClean.match(/\d+/g) || []).map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
        if (epNums.length > 1) {
          if (epNums.includes(singleTarget)) return true;
          const min = Math.min(...epNums);
          const max = Math.max(...epNums);
          if (singleTarget >= min && singleTarget <= max) return true;
        }
        return false;
      });
      if (rangeMatch) return rangeMatch;
    } else {
      // Target là dải số (ví dụ target="39-40"), tìm episode khớp với số đầu tiên của dải
      const firstTarget = targetNumbers[0];
      const matchFirst = episodes.find((e) => {
        const slugClean = (e.slug || "").toLowerCase().replace(/^(tap|ep)[-_\s]*/i, "").trim();
        if (/^\d+$/.test(slugClean) && parseInt(slugClean, 10) === firstTarget) return true;
        return false;
      });
      if (matchFirst) return matchFirst;
    }
  }

  return undefined;
}

/**
 * Lấy nhãn hiển thị rút gọn cho nút bấm tập phim trong lưới (ví dụ: "Tập 490" -> "490", "Tập Full" -> "Full")
 * Chống triệt để việc chữ bị tràn và cắt cụt thành "Tập 49..." trên mobile
 */
export function getShortEpisodeLabel(name?: string, fallback = "1"): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;

  // Bỏ tiền tố "Tập ", "tập ", "Tập: ", "Ep ", "Ep. "
  const stripped = trimmed.replace(/^(tập|tap|ep|ep\.)\s*[:.-]?\s*/i, "").trim();
  return stripped || trimmed;
}

