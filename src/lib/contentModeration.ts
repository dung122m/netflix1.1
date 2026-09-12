/**
 * Bộ lọc kiểm duyệt nội dung & phòng chống ngôn từ không phù hợp thuần phong mỹ tục
 * Hỗ trợ tiếng Việt, tiếng Anh, viết tắt, teen-code và các biến thể cố ý né tránh (obfuscation).
 */

// 1. Danh sách từ ngữ cấm (Việt Nam & Quốc tế)
const VIETNAMESE_PROFANITIES = [
  // Tục tĩu, chửi thề trực tiếp
  "địt", "dit", "d!t", "đ!t", "đyt", "dyt", "đjt", "djt",
  "đụ", "du", "duma", "đuma", "đụ má", "du ma", "đụ mẹ", "du me", "dume", "đume",
  "lồn", "lon", "loz", "l0z", "l0n", "l**", "lìn", "lin", "lò tôn",
  "cặc", "cac", "c4c", "kax", "buồi", "buoi", "b**i", "dái", "dai", "chim cút",
  "đéo", "deo", "đếch", "dech", "đách", "dach",
  "đĩ", "di~", "cave", "gái bao", "gai bao", "gái gọi", "gai goi", "điếm", "diem",
  "chó đẻ", "cho de", "chó chết", "cho chet", "óc chó", "oc cho", "mẹ kiếp", "me kiep",
  "thằng chó", "thang cho", "con chó", "con cho", "đồ chó", "do cho", "mẹ mày", "me may",
  "cẩu tặc", "hãm lồn", "ham lon", "xàm lồn", "xam lon", "vãi lồn", "vai lon", "vãi cặc", "vai cac",
  "chịch", "chich", "xoạc", "xoac", "nứng", "nung", "thủ dâm", "thu dam", "dâm đãng", "dam dang",
  "ấu dâm", "au dam", "khiêu dâm", "khieu dam", "phim heo", "phim sex", "link sex",
  "bú liếm", "bu liem", "bú cu", "bu cu", "bú lol", "bu lol",

  // Viết tắt & teen-code phổ biến
  "dm", "đm", "dcm", "đcm", "dcmm", "đcmm", "vcl", "vkl", "vcll", "vkll",
  "vl", "v~l", "clgt", "cl", "cc", "dkmm", "đkmm", "dkm", "đkm", "dmm", "đmm",
  "đcmm", "vlon", "vloz", "vlin", "vcc", "vcl", "vđ", "vclol",

  // Lừa đảo, cờ bạc, tệ nạn, kích động
  "nhà cái", "nha cai", "kubet", "thabet", "tai xiu", "tài xỉu", "cá độ", "ca do",
  "đánh bạc", "danh bac", "lô đề", "lo de", "link cá cược", "kèo banh",
  "vay nặng lãi", "bốc bát họ", "lừa đảo", "lua dao", "scam",
  "phản động", "phan dong", "chống phá", "chong pha",
];

const ENGLISH_PROFANITIES = [
  "fuck", "fucking", "fucker", "f*ck", "fck", "fuk", "motherfucker", "mf",
  "bitch", "b*tch", "btch", "biches", "son of a bitch",
  "cunt", "c*nt", "dick", "d*ck", "pussy", "p*ssy", "cock", "c*ck",
  "asshole", "a**hole", "bastard", "slut", "whore", "wh*re",
  "nigger", "nigga", "n*gger", "n*gga", "faggot", "retard",
  "porn", "porno", "xxx", "blowjob", "handjob", "cum", "deepthroat",
  "shit", "sh*t", "bullshit", "jackass", "dumbass",
];

// Gộp tất cả từ cấm thành tập hợp
const ALL_BANNED_WORDS = Array.from(new Set([...VIETNAMESE_PROFANITIES, ...ENGLISH_PROFANITIES]));

/**
 * Chuẩn hóa văn bản: Chuyển ký tự teen-code / leetspeak và gộp ký tự lặp
 */
export function normalizeTextForModeration(text: string): string {
  if (!text) return "";
  let normalized = text.toLowerCase();

  // 1. Chuyển leetspeak cơ bản: @ -> a, 0 -> o, 1 -> i/l, 3 -> e, $ -> s, ! -> i, v.v.
  normalized = normalized
    .replace(/[@]/g, "a")
    .replace(/[0]/g, "o")
    .replace(/[3]/g, "e")
    .replace(/[$]/g, "s")
    .replace(/[!]/g, "i")
    .replace(/[1]/g, "i")
    .replace(/[4]/g, "a")
    .replace(/[5]/g, "s")
    .replace(/[7]/g, "t");

  // 2. Xóa các ký tự phân cách cố ý chèn giữa từ cấm như d.m, d_m, d-m, f.u.c.k, d*ck
  // Thay thế dấu phân cách đặc biệt bằng khoảng trắng hoặc gộp
  normalized = normalized.replace(/[*_#~^+=/\\|.,\-:]+/g, " ");

  // 3. Gộp các ký tự lặp liên tiếp: vd "đmmmmm" -> "đm", "fuuuuck" -> "fuck"
  normalized = normalized.replace(/(.)\1{2,}/g, "$1$1");

  // 4. Chuẩn hóa khoảng trắng
  return normalized.replace(/\s+/g, " ").trim();
}

/**
 * Chuyển tiếng Việt có dấu sang không dấu
 */
export function removeVietnameseAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export interface ModerationResult {
  isAllowed: boolean;
  violations: string[];
  reason?: string;
  isSpam?: boolean;
}

/**
 * Kiểm tra xem nội dung có vi phạm từ ngữ thuần phong mỹ tục hoặc chứa spam hay không
 */
export function checkContentModeration(content: string): ModerationResult {
  if (!content || !content.trim()) {
    return { isAllowed: true, violations: [] };
  }

  const raw = content.trim();
  const normalized = normalizeTextForModeration(raw);
  const normalizedNoAccents = removeVietnameseAccents(normalized);

  // 1. Kiểm tra spam ký tự lặp vô nghĩa (vd: "aaaaaaaaaaaaaaaaaaaaaa", "111111111111111")
  if (/(.)\1{9,}/.test(raw)) {
    return {
      isAllowed: false,
      violations: ["spam_repeated_chars"],
      reason: "Nội dung chứa chuỗi ký tự lặp lại quá nhiều lần (Spam).",
      isSpam: true,
    };
  }

  // 2. Kiểm tra spam từ lặp (vd: "phim hay phim hay phim hay phim hay...")
  const words = normalized.split(/\s+/);
  if (words.length >= 8) {
    const wordCounts = new Map<string, number>();
    words.forEach((w) => {
      if (w.length > 2) {
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
    });
    for (const [, count] of wordCounts.entries()) {
      if (count >= 6 && count / words.length > 0.6) {
        return {
          isAllowed: false,
          violations: ["spam_repeated_words"],
          reason: "Nội dung có dấu hiệu lặp từ spam liên tục.",
          isSpam: true,
        };
      }
    }
  }

  // 3. Quét danh sách từ cấm
  const matchedViolations: string[] = [];

  // Tách các từ riêng lẻ trong văn bản để so khớp từ nguyên (exact word token match)
  const tokenSet = new Set(words);
  const wordsNoAccents = normalizedNoAccents.split(/\s+/);
  const tokenSetNoAccents = new Set(wordsNoAccents);

  for (const banned of ALL_BANNED_WORDS) {
    const bannedNoAccents = removeVietnameseAccents(banned);

    // A. Nếu từ cấm có nhiều từ ghép (vd "đụ má", "óc chó", "gái gọi", "son of a bitch")
    if (banned.includes(" ")) {
      if (
        normalized.includes(banned) ||
        normalizedNoAccents.includes(bannedNoAccents)
      ) {
        matchedViolations.push(banned);
      }
    } else {
      // B. Nếu từ cấm là từ đơn hoặc viết tắt (vd "dm", "vcl", "fuck", "cặc", "địt")
      // So khớp chính xác token để tránh bắt nhầm các từ hợp lệ như "đặc sắc", "phim lẻ"
      if (
        tokenSet.has(banned) ||
        tokenSetNoAccents.has(bannedNoAccents)
      ) {
        matchedViolations.push(banned);
      }
    }
  }

  if (matchedViolations.length > 0) {
    const uniqueViolations = Array.from(new Set(matchedViolations));
    return {
      isAllowed: false,
      violations: uniqueViolations,
      reason: "Bình luận chứa từ ngữ không phù hợp với tiêu chuẩn cộng đồng và thuần phong mỹ tục.",
      isSpam: false,
    };
  }

  return {
    isAllowed: true,
    violations: [],
  };
}

/**
 * Trình theo dõi tần suất gửi bình luận để ngăn chặn spam tốc độ cao
 */
const userPostTimestamps = new Map<string, number[]>();

export function checkUserRateLimit(userId: string, maxPostsInWindow = 4, windowSeconds = 30): boolean {
  if (!userId) return true;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  const timestamps = userPostTimestamps.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxPostsInWindow) {
    return false; // Bị giới hạn tốc độ
  }

  validTimestamps.push(now);
  userPostTimestamps.set(userId, validTimestamps);
  return true;
}
