/**
 * Chuẩn hóa và định dạng tên tập phim an toàn, chống triệt để lỗi lặp từ như "Tập Tập 01"
 */
export function formatEpisodeName(name?: string, fallback = "Tập 1"): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;

  // Nếu tên tập đã bắt đầu bằng chữ "Tập" hoặc "tap" (ví dụ: "Tập 01", "Tập 12")
  if (/^tập\s*/i.test(trimmed)) {
    return trimmed;
  }

  // Nếu là chữ "Full"
  if (/^full$/i.test(trimmed)) {
    return "Bản Full";
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

  // 3. So khớp số học nguyên vẹn (chống lỗi 1049 vô tình khớp nhầm 1049-2)
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

