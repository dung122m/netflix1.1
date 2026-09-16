/**
 * Bộ lọc kiểm duyệt nội dung & phòng chống ngôn từ không phù hợp thuần phong mỹ tục
 * Hỗ trợ tiếng Việt, tiếng Anh, viết tắt, teen-code và các biến thể cố ý né tránh (obfuscation).
 */

// 1. Danh sách từ ngữ cấm có dấu (chỉ bắt khi có dấu hoặc là cụm từ chính xác)
const ACCENTED_PROFANITIES = [
  // Tục tĩu, chửi thề trực tiếp có dấu
  "địt", "d!t", "đ!t", "đyt", "đjt",
  "đụ", "duma", "đuma", "đụ má", "đụ mẹ", "dume", "đume",
  "lồn", "loz", "l0z", "l0n", "lò tôn",
  "cặc", "c4c", "kax", "buồi", "dái",
  "đéo", "đếch", "đách",
  "đĩ", "di~", "cave", "gái bao", "gái gọi", "điếm",
  "chó đẻ", "chó chết", "óc chó", "mẹ kiếp", "thằng chó", "con chó", "đồ chó", "mẹ mày",
  "cẩu tặc", "hãm lồn", "xàm lồn", "vãi lồn", "vãi cặc",
  "chịch", "xoạc", "nứng", "thủ dâm", "dâm đãng", "ấu dâm", "khiêu dâm", "phim heo", "phim sex", "link sex",
  "bú liếm", "bú cu", "bú lol",
];

// 2. Danh sách cụm từ không dấu & từ lóng, viết tắt có độ chính xác cao (tránh nhầm lẫn từ đơn thông dụng)
const UNACCENTED_COMPOUND_OR_SLANG = [
  // Cụm từ chửi bới / nhạy cảm không dấu (2 từ trở lên)
  "du ma", "du me", "duma", "dume", "dit me", "dit ba", "dit cu",
  "ham lon", "xam lon", "vai lon", "vai cac",
  "cho de", "oc cho", "me may", "me kiep", "thang cho", "con cho", "do cho",
  "bu cu", "bu lol", "bu liem", "gai bao", "gai goi", "phim heo", "phim sex", "link sex",
  "thu dam", "dam dang", "au dam", "khieu dam",

  // Viết tắt & teen-code phổ biến có tính xác định cao
  "dm", "đm", "dcm", "đcm", "dcmm", "đcmm", "vcl", "vkl", "vcll", "vkll",
  "clgt", "dkmm", "đkmm", "dkm", "đkm", "dmm", "đmm",
  "vlon", "vloz", "vlin", "vcc",

  // Lừa đảo, cờ bạc, tệ nạn, kích động
  "nhà cái", "nha cai", "kubet", "thabet", "tai xiu", "tài xỉu", "cá độ", "ca do",
  "đánh bạc", "danh bac", "lô đề", "lo de", "link cá cược", "link ca cuoc", "kèo banh", "keo banh",
  "vay nặng lãi", "vay nang lai", "bốc bát họ", "boc bat ho", "lừa đảo", "lua dao", "scam",
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

  // 2. Chuyển tất cả dấu câu và ký tự phân cách thành khoảng trắng (bao gồm ngoặc đơn, chấm, phẩy...)
  normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, " ");

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
  const words = normalized.split(/\s+/).filter(Boolean);
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
  const tokenSet = new Set(words);
  const wordsNoAccents = normalizedNoAccents.split(/\s+/).filter(Boolean);
  const tokenSetNoAccents = new Set(wordsNoAccents);

  // A. So khớp từ cấm có dấu (chính xác theo từ hoặc cụm)
  for (const banned of ACCENTED_PROFANITIES) {
    if (banned.includes(" ")) {
      if (normalized.includes(banned)) {
        matchedViolations.push(banned);
      }
    } else {
      if (tokenSet.has(banned)) {
        matchedViolations.push(banned);
      }
    }
  }

  // B. So khớp cụm từ nhạy cảm không dấu & từ lóng / viết tắt (an toàn, không bắt nhầm từ đơn phổ thông)
  for (const item of UNACCENTED_COMPOUND_OR_SLANG) {
    const itemNoAcc = removeVietnameseAccents(item.toLowerCase());
    if (itemNoAcc.includes(" ")) {
      if (normalizedNoAccents.includes(itemNoAcc)) {
        matchedViolations.push(item);
      }
    } else {
      if (tokenSetNoAccents.has(itemNoAcc) || tokenSet.has(item)) {
        matchedViolations.push(item);
      }
    }
  }

  // C. So khớp từ cấm tiếng Anh
  for (const eng of ENGLISH_PROFANITIES) {
    if (eng.includes(" ")) {
      if (normalizedNoAccents.includes(eng)) {
        matchedViolations.push(eng);
      }
    } else {
      if (tokenSetNoAccents.has(eng)) {
        matchedViolations.push(eng);
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

// 4. Danh sách cụm từ nhận diện tự động tiết lộ nội dung (Auto Spoiler Detection)
const SPOILER_PHRASES = [
  // Cảnh báo trực tiếp
  "spoiler", "spoil",
  
  // Cái kết & hồi kết
  "cai ket", "cái kết",
  "ket phim", "kết phim",
  "ket thuc phim", "kết thúc phim",
  "doan ket", "đoạn kết",
  "hoi ket", "hồi kết",
  "cuoi phim", "cuối phim",
  "ket cuc", "kết cục",
  "tap cuoi", "tập cuối",
  "canh cuoi", "cảnh cuối",
  "ket mo", "kết mở",
  "ket hau", "kết hậu",
  "after credit", "mid credit", "post credit",

  // Cốt truyện & cú twist
  "trum cuoi", "trùm cuối",
  "hung thu", "hung thủ",
  "thu pham", "thủ phạm",
  "ke phan boi", "kẻ phản bội",
  "plot twist", "cu twist", "cú twist",
  "cai chet cua", "cái chết của",
  "chet o cuoi", "chết ở cuối",
  "thuc ra la", "thực ra là",
  "thuc chat la", "thực chất là",
  "hoa ra la", "hóa ra là",
  "giai thich ket", "giải thích kết"
];

/**
 * Tự động phát hiện xem bình luận có chứa chi tiết tiết lộ kết thúc hoặc cốt truyện (Spoiler) hay không
 */
export function detectSpoiler(content: string): boolean {
  if (!content) return false;
  const normalized = normalizeTextForModeration(content);
  const normalizedNoAccents = removeVietnameseAccents(normalized);

  for (const phrase of SPOILER_PHRASES) {
    const phraseNoAcc = removeVietnameseAccents(phrase.toLowerCase());
    if (normalized.includes(phrase) || normalizedNoAccents.includes(phraseNoAcc)) {
      return true;
    }
  }

  return false;
}

