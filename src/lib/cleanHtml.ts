/**
 * Tiện ích giải mã thực thể HTML và làm sạch văn bản phim trên toàn hệ thống
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&#160;": " ",
  "&amp;": "&",
  "&#38;": "&",
  "&quot;": '"',
  "&#34;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&#039;": "'",
  "&lt;": "<",
  "&#60;": "<",
  "&gt;": ">",
  "&#62;": ">",
  "&ndash;": "–",
  "&#8211;": "–",
  "&mdash;": "—",
  "&#8212;": "—",
  "&hellip;": "…",
  "&#8230;": "…",
  "&ldquo;": '"',
  "&#8220;": '"',
  "&rdquo;": '"',
  "&#8221;": '"',
  "&lsquo;": "'",
  "&#8216;": "'",
  "&rsquo;": "'",
  "&#8217;": "'",
  "&trade;": "™",
  "&#8482;": "™",
  "&copy;": "©",
  "&#169;": "©",
  "&reg;": "®",
  "&#174;": "®",
};

/**
 * Giải mã HTML Entities và lọc sạch thẻ HTML, ký tự rác
 */
export function cleanHtmlText(rawText: string | null | undefined): string {
  if (!rawText) return "";
  let str = String(rawText);

  // 1. Loại bỏ các thẻ HTML (<p>, <br>, <em>, <span>, <div>, <b>, <i>, <a>...)
  str = str.replace(/<[^>]*>/g, " ");

  // 2. Xử lý trường hợp dính liền như &nbsp;-&nbsp; hoặc &nbsp;
  str = str.replace(/&nbsp;\s*-\s*&nbsp;/gi, " - ");
  str = str.replace(/&nbsp;/gi, " ");

  // 3. Giải mã các Named Entities phổ biến
  for (const [entity, replacement] of Object.entries(HTML_ENTITY_MAP)) {
    if (str.includes(entity) || str.toLowerCase().includes(entity)) {
      str = str.replace(new RegExp(entity, "gi"), replacement);
    }
  }

  // 4. Giải mã các mã số thập phân &#123; và hex &#x7b;
  str = str.replace(/&#(\d+);/g, (_, dec) => {
    try {
      const code = parseInt(dec, 10);
      return code > 0 ? String.fromCharCode(code) : "";
    } catch {
      return "";
    }
  });

  str = str.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    try {
      const code = parseInt(hex, 16);
      return code > 0 ? String.fromCharCode(code) : "";
    } catch {
      return "";
    }
  });

  // 5. Thay thế ký tự non-breaking space Unicode (\u00A0, \u200B...) thành khoảng trắng thông thường
  str = str.replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ");

  // 6. Chuẩn hóa khoảng trắng & dấu ngắt câu
  str = str
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

  return str;
}
