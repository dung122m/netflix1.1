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
