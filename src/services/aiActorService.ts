import { movieApi } from "@/services/movieApi";
import { generateFastAiChat } from "@/services/aiProviderService";
import { getActorFilmographyFromTmdb, searchTmdbPerson } from "@/services/tmdbService";
import { kvCache } from "@/services/kvCacheService";
import { normalizeForMatch } from "@/lib/stringUtils";

export interface ActorProfile {
  name: string;
  aliases: string[];
  country: string;
}

/**
 * DANH SÁCH DIỄN VIÊN / NGHỆ SĨ HÀNG ĐẦU (TIER 1 - PRE-INDEXED)
 * Tốc độ tức thì (0ms), độ chính xác 100%, không tốn token AI, không phụ thuộc mạng.
 */
export const GOLDEN_ACTOR_INDEX: ActorProfile[] = [
  // --- VIỆT NAM ---
  {
    name: "Trường Giang",
    aliases: ["truong giang", "mười khó", "muoi kho", "mc truong giang", "danh hai truong giang"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Trấn Thành",
    aliases: ["tran thanh", "a xìn", "mc xìn", "mc tran thanh", "dao dien tran thanh"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Thái Hòa",
    aliases: ["thai hoa", "ông hoàng phòng vé thái hòa", "ong hoang phong ve thai hoa"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Ninh Dương Lan Ngọc",
    aliases: ["ninh duong lan ngoc", "lan ngoc", "ngoc nu ninh duong lan ngoc"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Kaity Nguyễn",
    aliases: ["kaity nguyen", "kaity"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Kiều Minh Tuấn",
    aliases: ["kieu minh tuan"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Thu Trang",
    aliases: ["thu trang", "hoa hậu hài thu trang", "chi muoi ba"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Lý Hải",
    aliases: ["ly hai", "dao dien ly hai"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Hoài Linh",
    aliases: ["hoai linh", "nsut hoai linh", "danh hai hoai linh", "sau sang"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Việt Hương",
    aliases: ["viet huong", "nghe si viet huong"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Tuấn Trần",
    aliases: ["tuan tran"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Miu Lê",
    aliases: ["miu le"],
    country: "Việt Nam 🇻🇳",
  },

  // --- HÀN QUỐC ---
  {
    name: "Kim Ji-won",
    aliases: ["kim ji won", "kim jiwon", "hong hae in"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Son Ye-jin",
    aliases: ["son ye jin", "son yejin"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Song Kang",
    aliases: ["song kang"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Hyun Bin",
    aliases: ["hyun bin", "hyeon bin"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Song Joong-ki",
    aliases: ["song joong ki", "song joongki"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Kim Soo-hyun",
    aliases: ["kim soo hyun", "kim soohyun"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Park Seo-joon",
    aliases: ["park seo joon", "park seojun"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Lee Min-ho",
    aliases: ["lee min ho", "lee minho"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "IU (Lee Ji-eun)",
    aliases: ["iu", "lee ji eun", "lee jieun"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Cha Eun-woo",
    aliases: ["cha eun woo", "cha eunwoo"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Lee Jong-suk",
    aliases: ["lee jong suk", "lee jongsuk"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Gong Yoo",
    aliases: ["gong yoo", "gong yoo"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Han So-hee",
    aliases: ["han so hee", "han sohee"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Song Hye-kyo",
    aliases: ["song hye kyo", "song hyekyo"],
    country: "Hàn Quốc 🇰🇷",
  },

  // --- TRUNG QUỐC / HỒNG KÔNG ---
  {
    name: "Châu Tinh Trì",
    aliases: ["chau tinh tri", "tinh gia", "stephen chow", "vua hai chau tinh tri"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Dương Mịch",
    aliases: ["duong mich", "yang mi"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Triệu Lệ Dĩnh",
    aliases: ["trieu le dinh", "zhao liying", "zanilia zhao"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Tiêu Chiến",
    aliases: ["tieu chien", "xiao zhan", "sean xiao"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Vương Nhất Bác",
    aliases: ["vuong nhat bac", "wang yibo"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Lưu Diệc Phi",
    aliases: ["luu diec phi", "crystal liu", "liu yifei", "than tien ty ty"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Tạ Đình Phong",
    aliases: ["ta dinh phong", "nicholas tse", "tạ đình phong"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Lưu Đức Hoa",
    aliases: ["luu duc hoa", "andy lau", "thiên vương lưu đức hoa"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Lương Triều Vỹ",
    aliases: ["luong trieu vy", "tony leung", "tony leung chiu wai"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Cổ Thiên Lạc",
    aliases: ["co thien lac", "louis koo"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Trịnh Gia Dĩnh",
    aliases: ["trinh gia dinh", "kevin cheng"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Âu Dương Chấn Hoa",
    aliases: ["au duong chan hoa", "bobby au yeung", "bobby au-yeung"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Thành Long",
    aliases: [
      "thanh long",
      "thành long",
      "jackie chan",
      "chan kong-sang",
      "chan kong sang",
      "sing lung",
      "trần cảng sinh",
      "tran cang sinh",
    ],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Lý Liên Kiệt",
    aliases: ["ly lien kiet", "jet li"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Chân Tử Đan",
    aliases: ["chan tu dan", "donnie yen"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Địch Lệ Nhiệt Ba",
    aliases: ["dich le nhiet ba", "dilraba dilmurat", "dilraba"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Dương Dương",
    aliases: ["duong duong", "yang yang"],
    country: "Trung Quốc 🇨🇳",
  },

  // --- HOLLYWOOD / QUỐC TẾ ---
  {
    name: "Benedict Cumberbatch",
    aliases: ["benedict cumberbatch", "cumberbatch", "doctor strange"],
    country: "Hollywood 🇺🇸 / Anh Quốc 🇬🇧",
  },
  {
    name: "Cillian Murphy",
    aliases: ["cillian murphy", "murphy", "oppenheimer", "thomas shelby"],
    country: "Hollywood 🇺🇸 / Anh Quốc 🇬🇧",
  },
  {
    name: "Tom Cruise",
    aliases: ["tom cruise", "cruise", "ethan hunt"],
    country: "Hollywood 🇺🇸",
  },
  {
    name: "Leonardo DiCaprio",
    aliases: ["leonardo dicaprio", "dicaprio", "leo dicaprio"],
    country: "Hollywood 🇺🇸",
  },
  {
    name: "Robert Downey Jr",
    aliases: ["robert downey jr", "robert downey", "iron man", "tony stark"],
    country: "Hollywood 🇺🇸",
  },
  {
    name: "Christopher Nolan",
    aliases: ["christopher nolan", "nolan", "dao dien nolan"],
    country: "Hollywood 🇺🇸 / Anh Quốc 🇬🇧",
  },
  {
    name: "Keanu Reeves",
    aliases: ["keanu reeves", "john wick", "neo"],
    country: "Hollywood 🇺🇸",
  },
  {
    name: "Scarlett Johansson",
    aliases: ["scarlett johansson", "black widow", "natasha romanoff"],
    country: "Hollywood 🇺🇸",
  },
  {
    name: "Tom Hiddleston",
    aliases: ["tom hiddleston", "loki"],
    country: "Hollywood 🇺🇸 / Anh Quốc 🇬🇧",
  },
  {
    name: "Margot Robbie",
    aliases: ["margot robbie", "harley quinn", "barbie"],
    country: "Hollywood 🇺🇸 / Úc 🇦🇺",
  },
  {
    name: "Dwayne Johnson (The Rock)",
    aliases: ["dwayne johnson", "the rock"],
    country: "Hollywood 🇺🇸",
  },
  {
    name: "Ryan Reynolds",
    aliases: ["ryan reynolds", "deadpool"],
    country: "Hollywood 🇺🇸",
  },

  // --- THÁI LAN & NHẬT BẢN ---
  {
    name: "Baifern Pimchanok",
    aliases: ["baifern pimchanok", "baifern", "pimchanok"],
    country: "Thái Lan 🇹🇭",
  },
  {
    name: "Mario Maurer",
    aliases: ["mario maurer", "mario"],
    country: "Thái Lan 🇹🇭",
  },
  {
    name: "Ken Watanabe",
    aliases: ["ken watanabe"],
    country: "Nhật Bản 🇯🇵",
  },
  {
    name: "Hayao Miyazaki",
    aliases: ["hayao miyazaki", "miyazaki", "ghibli"],
    country: "Nhật Bản 🇯🇵",
  },
  {
    name: "Makoto Shinkai",
    aliases: ["makoto shinkai", "shinkai"],
    country: "Nhật Bản 🇯🇵",
  },
];

// In-memory cache thông minh cho các truy vấn AI phân giải diễn viên (TTL: 7 ngày)
const ACTOR_AI_CACHE = new Map<
  string,
  { actorName: string; country?: string; aliases: string[]; isActor: boolean; expireAt: number }
>();
const CACHE_7_DAYS = 7 * 24 * 60 * 60 * 1000;

// In-memory cache cho danh sách phim đã tìm thấy từ kho (TTL: 12h fresh, 48h stale SWR)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTOR_FILM_CACHE = new Map<string, { items: any[]; expireAt: number; staleUntil: number }>();

function setBoundedCache<K, V>(map: Map<K, V>, key: K, value: V, max = 500) {
  if (map.size >= max) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, value);
}

export { normalizeForMatch };

/**
 * Kiểm tra xem từ khóa có tiền tố chỉ định rõ ràng là tìm kiếm DIỄN VIÊN / ĐẠO DIỄN hay không.
 */
export function hasExplicitActorPrefix(query: string): boolean {
  const q = (query || "").trim();
  return /^(?:diễn\s+viên|dien\s+vien|đạo\s+diễn|dao\s+dien|phim\s+của|phim\s+cua|tuyển\s+tập\s+(?:phim\s+)?(?:của\s+)?|tuyen\s+tap\s+(?:phim\s+)?(?:cua\s+)?|actor\s*:\s*)/i.test(q);
}

// Tập hợp các từ khóa ngắn/từ đơn thông dụng dễ trùng tên phim hoặc từ thông dụng tiếng Việt
const COMMON_AMBIGUOUS_SHORT_WORDS = new Set([
  "mai", "an", "anh", "em", "nam", "hoa", "tam", "binh", "long", "ha",
  "linh", "dung", "phuc", "dat", "duc", "thao", "trang", "huong", "ngoc",
  "minh", "khoa", "thang", "quan", "hung", "son", "tuan", "hai", "vu",
  "bao", "cuong", "phong", "hieu", "huy", "giang", "thanh", "thuy", "yen",
  "thu", "quyen", "tien", "trieu", "viet", "khanh", "kien", "phuong",
  "nga", "loan", "diep", "sen", "truc", "dao", "cuc", "nhi", "lan",
  "bac", "trung", "do", "den", "xanh", "vang", "nha", "pho",
  "me", "cha", "con", "vo", "chong", "ba", "ong", "co", "chu"
]);

/**
 * Kiểm tra xem từ khóa có phải là từ ngắn/từ đơn mơ hồ (dễ là tên phim) mà không có tiền tố diễn viên rõ ràng hay không.
 */
export function isAmbiguousShortActorKeyword(query: string): boolean {
  const trimmed = (query || "").trim();
  if (!trimmed) return true;
  // Nếu có tiền tố rõ ràng như "diễn viên Mai", "phim của Mai" -> không bị coi là ambiguous
  if (hasExplicitActorPrefix(trimmed)) return false;

  const cleanNorm = normalizeForMatch(trimmed).toLowerCase();
  if (COMMON_AMBIGUOUS_SHORT_WORDS.has(cleanNorm)) return true;

  // Từ đơn (chỉ có 1 từ) và độ dài <= 4 ký tự (ví dụ: Mai, An, Anh, Ha, Nam...)
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 && trimmed.length <= 4) return true;

  return false;
}

export function cleanActorQuery(query: string): string {
  return (query || "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^phim\s+cua\s+/gi, "")
    .replace(/^tuyen\s+tap\s+(?:phim\s+)?(?:cua\s+)?/gi, "")
    .replace(/^dien\s+vien\s+/gi, "")
    .replace(/^dao\s+dien\s+/gi, "")
    .replace(/^actor\s*:\s*/gi, "")
    .replace(/\s+dong$/gi, "")
    .replace(/\s+dien\s+xuat$/gi, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =========================================================================
// 1. TỪ ĐIỂN ALIAS (BÍ DANH) & TÊN CHUẨN TRONG DATABASE (CANONICAL ALIAS MAP)
// Map trực tiếp từ khóa/biệt danh/tên tiếng Việt thường gọi sang TÊN CHUẨN DUY NHẤT trong Database:
// Ví dụ:
//   {"iron man": "Robert Downey Jr", "rdj": "Robert Downey Jr", "trấn thành": "Huỳnh Trấn Thành"}
// =========================================================================
export const ACTOR_CANONICAL_MAP: Record<string, string> = {
  // Marvel & Hollywood
  "iron man": "Robert Downey Jr",
  "nguoi sat": "Robert Downey Jr",
  "người sắt": "Robert Downey Jr",
  "rdj": "Robert Downey Jr",
  "robert downey": "Robert Downey Jr",
  "robert downey jr": "Robert Downey Jr",
  "captain america": "Chris Evans",
  "doi truong my": "Chris Evans",
  "đội trưởng mỹ": "Chris Evans",
  "chris evans": "Chris Evans",
  "thor": "Chris Hemsworth",
  "than sam": "Chris Hemsworth",
  "thần sấm": "Chris Hemsworth",
  "chris hemsworth": "Chris Hemsworth",
  "spider man": "Tom Holland",
  "spiderman": "Tom Holland",
  "nguoi nhen": "Tom Holland",
  "người nhện": "Tom Holland",
  "tom holland": "Tom Holland",
  "deadpool": "Ryan Reynolds",
  "ryan reynolds": "Ryan Reynolds",
  "wolverine": "Hugh Jackman",
  "hugh jackman": "Hugh Jackman",
  "john wick": "Keanu Reeves",
  "keanu reeves": "Keanu Reeves",
  "the rock": "Dwayne Johnson",
  "dwayne johnson": "Dwayne Johnson",
  "tom cruise": "Tom Cruise",
  "leonardo dicaprio": "Leonardo DiCaprio",
  "brad pitt": "Brad Pitt",
  "cillian murphy": "Cillian Murphy",
  "christian bale": "Christian Bale",
  "johnny depp": "Johnny Depp",
  "will smith": "Will Smith",
  "jason statham": "Jason Statham",
  "vin diesel": "Vin Diesel",
  "dom toretto": "Vin Diesel",
  "benedict cumberbatch": "Benedict Cumberbatch",
  "doctor strange": "Benedict Cumberbatch",
  "scarlett johansson": "Scarlett Johansson",
  "black widow": "Scarlett Johansson",
  "goa phu den": "Scarlett Johansson",
  "henry cavill": "Henry Cavill",
  "superman": "Henry Cavill",

  // Việt Nam
  "trấn thành": "Huỳnh Trấn Thành",
  "tran thanh": "Huỳnh Trấn Thành",
  "huỳnh trấn thành": "Huỳnh Trấn Thành",
  "huynh tran thanh": "Huỳnh Trấn Thành",
  "a xìn": "Huỳnh Trấn Thành",
  "a xin": "Huỳnh Trấn Thành",
  "mc trấn thành": "Huỳnh Trấn Thành",
  "mc tran thanh": "Huỳnh Trấn Thành",
  "xìn": "Huỳnh Trấn Thành",
  "trường giang": "Trường Giang",
  "truong giang": "Trường Giang",
  "mười khó": "Trường Giang",
  "muoi kho": "Trường Giang",
  "mc trường giang": "Trường Giang",
  "thái hòa": "Thái Hòa",
  "thai hoa": "Thái Hòa",
  "ông hoàng phòng vé": "Thái Hòa",
  "ong hoang phong ve": "Thái Hòa",
  "ông hoàng phòng vé thái hòa": "Thái Hòa",
  "lý hải": "Lý Hải",
  "ly hai": "Lý Hải",
  "đạo diễn lý hải": "Lý Hải",
  "thu trang": "Thu Trang",
  "hoa hậu hài thu trang": "Thu Trang",
  "chị mười ba": "Thu Trang",
  "chi muoi ba": "Thu Trang",
  "ninh dương lan ngọc": "Ninh Dương Lan Ngọc",
  "ninh duong lan ngoc": "Ninh Dương Lan Ngọc",
  "lan ngọc": "Ninh Dương Lan Ngọc",
  "lan ngoc": "Ninh Dương Lan Ngọc",
  "kaity nguyễn": "Kaity Nguyễn",
  "kaity nguyen": "Kaity Nguyễn",
  "kaity": "Kaity Nguyễn",
  "kiều minh tuấn": "Kiều Minh Tuấn",
  "kieu minh tuan": "Kiều Minh Tuấn",
  "hoài linh": "Hoài Linh",
  "hoai linh": "Hoài Linh",
  "sáu bảnh": "Hoài Linh",
  "việt hương": "Việt Hương",
  "viet huong": "Việt Hương",
  "mạc văn khoa": "Mạc Văn Khoa",
  "mac van khoa": "Mạc Văn Khoa",
  "tuấn trần": "Tuấn Trần",
  "tuan tran": "Tuấn Trần",
  "ngô thanh vân": "Ngô Thanh Vân",
  "ngo thanh van": "Ngô Thanh Vân",

  // Hồng Kông & Trung Quốc
  "thành long": "Jackie Chan",
  "thanh long": "Jackie Chan",
  "jackie chan": "Jackie Chan",
  "chan kong sang": "Jackie Chan",
  "chan kong-sang": "Jackie Chan",
  "sing lung": "Jackie Chan",
  "châu tinh trì": "Stephen Chow",
  "chau tinh tri": "Stephen Chow",
  "stephen chow": "Stephen Chow",
  "tinh gia": "Stephen Chow",
  "vua hài châu tinh trì": "Stephen Chow",
  "châu nhuận phát": "Chow Yun-Fat",
  "chau nhuan phat": "Chow Yun-Fat",
  "chow yun fat": "Chow Yun-Fat",
  "lưu đức hoa": "Andy Lau",
  "luu duc hoa": "Andy Lau",
  "andy lau": "Andy Lau",
  "chân tử đan": "Donnie Yen",
  "chan tu dan": "Donnie Yen",
  "donnie yen": "Donnie Yen",
  "diệp vấn": "Donnie Yen",
  "diep van": "Donnie Yen",
  "lý liên kiệt": "Jet Li",
  "ly lien kiet": "Jet Li",
  "jet li": "Jet Li",
  "ngô kinh": "Wu Jing",
  "ngo kinh": "Wu Jing",
  "wu jing": "Wu Jing",
  "cổ thiên lạc": "Louis Koo",
  "co thien lac": "Louis Koo",
  "louis koo": "Louis Koo",
  "lương triều vỹ": "Tony Leung",
  "luong trieu vy": "Tony Leung",
  "tony leung": "Tony Leung",
  "triệu lệ dĩnh": "Zhao Liying",
  "trieu le dinh": "Zhao Liying",
  "zhao liying": "Zhao Liying",
  "dương mịch": "Yang Mi",
  "duong mich": "Yang Mi",
  "yang mi": "Yang Mi",
  "địch lệ nhiệt ba": "Dilraba Dilmurat",
  "dich le nhiet ba": "Dilraba Dilmurat",
  "dilraba": "Dilraba Dilmurat",
  "tiêu chiến": "Xiao Zhan",
  "tieu chien": "Xiao Zhan",
  "xiao zhan": "Xiao Zhan",
  "vương nhất bác": "Wang Yibo",
  "vuong nhat bac": "Wang Yibo",
  "wang yibo": "Wang Yibo",
  "lưu diệc phi": "Liu Yifei",
  "luu diec phi": "Liu Yifei",
  "liu yifei": "Liu Yifei",
  "thần tiên tỷ tỷ": "Liu Yifei",
  "bạch lộc": "Bai Lu",
  "bach loc": "Bai Lu",
  "bai lu": "Bai Lu",
  "dương tử": "Yang Zi",
  "duong tu": "Yang Zi",
  "yang zi": "Yang Zi",

  // Hàn Quốc, Nhật Bản, Thái Lan
  "song joong ki": "Song Joong-ki",
  "song hye kyo": "Song Hye-kyo",
  "hyun bin": "Hyun Bin",
  "son ye jin": "Son Ye-jin",
  "iu": "Lee Ji-eun",
  "lee ji eun": "Lee Ji-eun",
  "park seo joon": "Park Seo-joon",
  "gong yoo": "Gong Yoo",
  "lee min ho": "Lee Min-ho",
  "ma dong seok": "Ma Dong-seok",
  "don lee": "Ma Dong-seok",
  "kim soo hyun": "Kim Soo-hyun",
  "lee jong suk": "Lee Jong-suk",
  "baifern": "Baifern Pimchanok",
  "baifern pimchanok": "Baifern Pimchanok",
  "mario maurer": "Mario Maurer",
  "ken watanabe": "Ken Watanabe",
  "hayao miyazaki": "Hayao Miyazaki",
  "makoto shinkai": "Makoto Shinkai",
};

// Bảng ánh xạ slug và bí danh diễn viên quốc tế & Việt Nam (Mapping Table / Synonym Dictionary)
export const ACTOR_SLUG_MAP: Record<string, string[]> = {
  // Hồng Kông / Trung Quốc
  "thanh-long": [
    "thành long",
    "thanh long",
    "jackie chan",
    "chan kong sang",
    "chan kong-sang",
    "sing lung",
    "trần cảng sinh",
    "tran cang sinh",
    "phòng sĩ long",
    "phong si long",
  ],
  "chau-tinh-tri": ["châu tinh trì", "chau tinh tri", "stephen chow", "chow sing chi", "tinh gia"],
  "chan-tu-dan": ["chân tử đan", "chan tu dan", "donnie yen", "yen ji dan"],
  "ly-lien-kiet": ["lý liên kiệt", "ly lien kiet", "jet li", "li lian jie"],
  "ngo-kinh": ["ngô kinh", "ngo kinh", "wu jing"],
  "luu-duc-hoa": ["lưu đức hoa", "luu duc hoa", "andy lau"],
  "luong-trieu-vy": ["lương triều vỹ", "luong trieu vy", "tony leung", "tony leung chiu wai"],
  "quach-phu-thanh": ["quách phú thành", "quach phu thanh", "aaron kwok"],
  "co-thien-lac": ["cổ thiên lạc", "co thien lac", "louis koo"],
  "truong-gia-huy": ["trương gia huy", "truong gia huy", "nick cheung"],
  "ta-dinh-phong": ["tạ đình phong", "ta dinh phong", "nicholas tse"],
  "hong-kim-bao": ["hồng kim bảo", "hong kim bao", "sammo hung"],
  "nguyen-biao": ["nguyên tiêu", "nguyen biao", "yuen biao"],
  "duong-mich": ["dương mịch", "duong mich", "yang mi"],
  "trieu-le-dinh": ["triệu lệ dĩnh", "trieu le dinh", "zhao liying", "zanilia zhao"],
  "dich-le-nhiet-ba": ["địch lệ nhiệt ba", "dich le nhiet ba", "dilraba dilmurat", "dilraba"],
  "tieu-chien": ["tiêu chiến", "tieu chien", "xiao zhan", "sean xiao"],
  "vuong-nhat-bac": ["vương nhất bác", "vuong nhat bac", "wang yibo"],
  "huynh-hieu-minh": ["huỳnh hiểu minh", "huynh hieu minh", "huang xiaoming"],
  "luu-diec-phi": ["lưu diệc phi", "luu diec phi", "crystal liu", "liu yifei"],
  "bach-loc": ["bạch lộc", "bach loc", "bai lu"],
  "la-van-hi": ["la vân hi", "la van hi", "leo luo", "luo yunxi"],
  "duong-tu": ["dương tử", "duong tu", "yang zi", "andy yang"],
  "nham-gia-luan": ["nhậm gia luân", "nham gia luan", "allen ren", "ren jialun"],
  "trieu-lo-tu": ["triệu lộ tư", "trieu lo tu", "zhao lusi", "rosy zhao"],
  "cuc-tinh-y": ["cúc tịnh y", "cuc tinh y", "ju jingyi"],
  "vuong-hac-de": ["vương hạc đệ", "vuong hac de", "dylan wang", "wang hedi"],
  "hua-khai": ["hứa khải", "hua khai", "xu kai"],
  "ngo-loi": ["ngô lỗi", "ngo loi", "leo wu", "wu lei"],
  "cung-tuan": ["cung tuấn", "cung tuan", "simon gong", "gong jun"],
  "chau-tan": ["châu tấn", "chau tan", "zhou xun"],
  "chuong-tu-di": ["chương tử di", "chuong tu di", "zhang ziyi"],
  "cung-loi": ["củng lợi", "cung loi", "gong li"],
  "thang-duy": ["thang duy", "tang wei"],
  "pham-bang-bang": ["phạm băng băng", "pham bang bang", "fan bingbing"],
  "ly-bang-bang": ["lý băng băng", "ly bang bang", "li bingbing"],

  "tran-thanh": ["trấn thành", "tran thanh", "mc tran thanh", "a xìn", "mc xìn", "dao dien tran thanh"],
  "truong-giang": ["trường giang", "truong giang", "mc truong giang", "mười khó", "muoi kho"],
  "thai-hoa": ["thái hòa", "thai hoa", "ông hoàng phòng vé thái hòa"],
  "ninh-duong-lan-ngoc": ["ninh dương lan ngọc", "ninh duong lan ngoc", "lan ngoc"],
  "kieu-minh-tuan": ["kiều minh tuấn", "kieu minh tuan"],
  "thu-trang": ["thu trang", "hoa hậu hài thu trang", "chị mười ba", "chi muoi ba"],
  "ly-hai": ["lý hải", "ly hai", "đạo diễn lý hải", "lat mat"],
  "hoai-linh": ["hoài linh", "hoai linh", "sáu bảnh", "sau sang"],
  "viet-huong": ["việt hương", "viet huong"],
  "tuan-tran": ["tuấn trần", "tuan tran"],
  "miu-le": ["miu lê", "miu le"],

  // Hollywood
  "tom-cruise": ["tom cruise", "thomas cruise mapother", "ethan hunt"],
  "keanu-reeves": ["keanu reeves", "keanu charles reeves", "john wick"],
  "leonardo-dicaprio": ["leonardo dicaprio", "leo dicaprio"],
  "dwayne-johnson": ["dwayne johnson", "the rock"],
  "jason-statham": ["jason statham"],
  "brad-pitt": ["brad pitt", "william bradley pitt"],
  "will-smith": ["will smith"],
  "robert-downey-jr": ["robert downey jr", "robert downey", "iron man"],
  "chris-evans": ["chris evans", "captain america"],
  "chris-hemsworth": ["chris hemsworth", "thor"],
  "scarlett-johansson": ["scarlett johansson", "black widow"],
  "ryan-reynolds": ["ryan reynolds", "deadpool"],
  "cillian-murphy": ["cillian murphy"],
  "christian-bale": ["christian bale", "batman"],

  // Hàn Quốc
  "song-joong-ki": ["song joong ki", "song joong-ki"],
  "kim-soo-hyun": ["kim soo hyun", "kim soo-hyun"],
  "hyun-bin": ["hyun bin", "hyeon bin"],
  "lee-min-ho": ["lee min ho", "lee min-ho"],
  "park-seo-joon": ["park seo joon", "park seo-jun"],
  "son-ye-jin": ["son ye jin", "son ye-jin"],
  "kim-ji-won": ["kim ji won", "kim ji-won", "hong hae in"],
  "song-kang": ["song kang"],
  "iu": ["iu", "lee ji eun", "lee ji-eun"],
  "cha-eun-woo": ["cha eun woo", "cha eunwoo"],
  "lee-jong-suk": ["lee jong suk", "lee jongsuk"],
  "gong-yoo": ["gong yoo"],
  "han-so-hee": ["han so hee", "han sohee"],
  "song-hye-kyo": ["song hye kyo", "song hyekyo"],
  "ma-dong-seok": ["ma dong seok", "ma dong-seok", "don lee"],
};

/**
 * 1. BẢNG QUY ĐỔI ĐỒNG NGHĨA (MAPPING TABLE / SYNONYM DICTIONARY)
 * Tra cứu mọi từ khóa (tiếng Việt có dấu, không dấu, tên tiếng Anh, nghệ danh, slug)
 * và trích xuất TOÀN BỘ các biến thể tên của diễn viên đó để thực hiện truy vấn đa biến thể.
 * Ví dụ: 'Thành Long' -> ['thành long', 'thanh long', 'jackie chan', 'chan kong sang', 'sing lung']
 */
export interface ActorSynonymResult {
  isMatched: boolean;
  slug: string;
  canonicalName: string;
  country?: string;
  variants: string[]; // Toàn bộ biến thể tên (Việt có dấu, không dấu, Anh/gốc, nghệ danh)
  englishName?: string;
}

export function getActorSynonyms(query: string): ActorSynonymResult {
  if (!query || query.trim().length < 2) {
    return { isMatched: false, slug: "", canonicalName: "", variants: [] };
  }

  const cleanRaw = query.trim().toLowerCase();
  const normalizedQuery = normalizeForMatch(query);
  const cleanedActorQ = cleanActorQuery(query);

  // 1. Tra cứu trực tiếp trong ACTOR_CANONICAL_MAP (Bí danh -> Tên chuẩn duy nhất trong Database)
  const canonicalDirect =
    ACTOR_CANONICAL_MAP[cleanRaw] ||
    ACTOR_CANONICAL_MAP[normalizedQuery] ||
    ACTOR_CANONICAL_MAP[cleanedActorQ];

  if (canonicalDirect) {
    const linkedAliases = Object.entries(ACTOR_CANONICAL_MAP)
      .filter(([, target]) => target.toLowerCase() === canonicalDirect.toLowerCase())
      .map(([key]) => key);

    const preset = GOLDEN_ACTOR_INDEX.find(
      (p) =>
        normalizeForMatch(p.name) === normalizeForMatch(canonicalDirect) ||
        p.aliases.some((pa) => normalizeForMatch(pa) === normalizeForMatch(canonicalDirect))
    );

    const allVariants = Array.from(
      new Set([
        canonicalDirect,
        canonicalDirect.toLowerCase(),
        normalizeForMatch(canonicalDirect),
        cleanRaw,
        normalizedQuery,
        ...linkedAliases,
        ...(preset?.aliases || []),
        ...(preset?.name ? [preset.name] : []),
      ].filter(Boolean))
    );

    const englishName = allVariants.find(
      (a) => !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(a) && a.includes(" ")
    ) || canonicalDirect;

    const slug = normalizeForMatch(canonicalDirect).replace(/\s+/g, "-");

    return {
      isMatched: true,
      slug,
      canonicalName: canonicalDirect,
      country: preset?.country,
      variants: allVariants,
      englishName,
    };
  }

  // 2. Đối chiếu qua ACTOR_SLUG_MAP
  for (const [slug, aliases] of Object.entries(ACTOR_SLUG_MAP)) {
    const normSlug = normalizeForMatch(slug.replace(/-/g, " "));
    const isSlugMatch = normalizedQuery === normSlug || cleanRaw === slug;
    const isAliasMatch = aliases.some((a) => {
      const normA = normalizeForMatch(a);
      return normA === normalizedQuery || cleanRaw === a.toLowerCase();
    });

    if (isSlugMatch || isAliasMatch) {
      const preset = GOLDEN_ACTOR_INDEX.find(
        (p) =>
          normalizeForMatch(p.name) === normalizedQuery ||
          p.aliases.some((pa) => normalizeForMatch(pa) === normalizedQuery) ||
          normalizeForMatch(p.name) === normSlug
      );

      const allVariants = Array.from(
        new Set([
          query.trim().toLowerCase(),
          normalizedQuery,
          slug.replace(/-/g, " "),
          ...aliases,
          ...(preset?.aliases || []),
          preset?.name?.toLowerCase(),
        ].filter((s): s is string => Boolean(s && s.trim().length >= 2)).map((s) => s.trim().toLowerCase()))
      );

      // Tìm tên tiếng Anh gốc (alias chữ Latinh không chứa dấu tiếng Việt và có dấu cách)
      const englishName = aliases.find(
        (a) => !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(a) && a.includes(" ")
      ) || aliases[2];

      const canonicalName = preset?.name || (aliases[0] ? aliases[0].replace(/\b\w/g, (l) => l.toUpperCase()) : query.trim());

      return {
        isMatched: true,
        slug,
        canonicalName,
        country: preset?.country,
        variants: allVariants,
        englishName,
      };
    }
  }

  // 2. Đối chiếu qua GOLDEN_ACTOR_INDEX nếu chưa có trong ACTOR_SLUG_MAP
  for (const preset of GOLDEN_ACTOR_INDEX) {
    const normPName = normalizeForMatch(preset.name);
    const isMatch = normPName === normalizedQuery || preset.aliases.some((a) => normalizeForMatch(a) === normalizedQuery || cleanRaw === a.toLowerCase());
    if (isMatch) {
      const allVariants = Array.from(
        new Set([
          query.trim().toLowerCase(),
          normalizedQuery,
          preset.name.toLowerCase(),
          ...preset.aliases.map((a) => a.toLowerCase()),
        ].filter(Boolean))
      );
      return {
        isMatched: true,
        slug: normalizeForMatch(preset.name).replace(/\s+/g, "-"),
        canonicalName: preset.name,
        country: preset.country,
        variants: allVariants,
      };
    }
  }

  return {
    isMatched: false,
    slug: "",
    canonicalName: query.trim(),
    variants: [query.trim().toLowerCase(), normalizedQuery].filter(Boolean),
  };
}

/**
 * 3. TOÁN TỬ REGEX KHÔNG PHÂN BIỆT HOA THƯỜNG ($regex, $options: 'i') CHO DATABASE MONGODB
 * Dùng tên chuẩn (canonical name) và các bí danh (aliases) để query trực tiếp vào Database trên trường mảng diễn viên/đạo diễn:
 *   { actors: { $regex: '...', $options: 'i' } }
 * Tuyệt đối không quét tiêu đề phim, database tự tìm ra phim động 100%!
 */
export function buildActorMongoQuery(
  canonicalOrVariants: string | string[],
  extraAliases: string[] = []
): Record<string, unknown> {
  const terms = Array.isArray(canonicalOrVariants)
    ? [...canonicalOrVariants, ...extraAliases]
    : [canonicalOrVariants, ...extraAliases];

  const searchTerms = Array.from(
    new Set(terms.filter((s): s is string => typeof s === "string" && s.trim().length >= 2))
  );

  const regexList = searchTerms.map(
    (v) => new RegExp(`(^|[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9])${escapeRegex(v)}($|[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9])`, "i")
  );

  const regexConditions = searchTerms.map((term) => ({
    $regex: escapeRegex(term),
    $options: "i",
  }));

  return {
    $or: [
      { actors: { $in: regexList } },
      { actor: { $in: regexList } },
      { casts: { $in: regexList } },
      { cast: { $in: regexList } },
      { director: { $in: regexList } },
      ...regexConditions.map((c) => ({ actors: c })),
      ...regexConditions.map((c) => ({ casts: c })),
      ...regexConditions.map((c) => ({ director: c })),
    ],
  };
}

export function buildActorSqlQuery(variants: string[], columnName = "actors"): string {
  // Chỉ truy vấn trên cột mảng nhân sự (actors / director / casts)
  const conditions = variants.map(
    (v) => `LOWER(${columnName}::text) LIKE '%${v.toLowerCase().replace(/'/g, "''")}%'`
  );
  return `(${conditions.join(" OR ")})`;
}

/**
 * 1. ĐẶC TẢ INDEX CHO DATABASE (MONGODB & POSTGRESQL / SUPABASE)
 * Cung cấp câu lệnh tạo Index chuẩn hóa cho Database trên các trường lọc (actors, director, category/genres, year)
 * nhằm tăng tốc độ truy vấn tối đa, triệt tiêu hoàn toàn hiện tượng quét toàn bộ bảng (Collection Scan - COLLSCAN).
 */
export function getRecommendedDatabaseIndexes(): {
  mongoIndexes: Array<{ collection: string; spec: Record<string, number>; options?: Record<string, unknown> }>;
  sqlIndexes: string[];
} {
  return {
    mongoIndexes: [
      { collection: "movies", spec: { actors: 1 }, options: { background: true, name: "idx_movies_actors_multikey" } },
      { collection: "movies", spec: { actor: 1 }, options: { background: true, name: "idx_movies_actor_multikey" } },
      { collection: "movies", spec: { director: 1 }, options: { background: true, name: "idx_movies_director_multikey" } },
      { collection: "movies", spec: { "category.slug": 1 }, options: { background: true, name: "idx_movies_genres_slug" } },
      { collection: "movies", spec: { year: -1 }, options: { background: true, name: "idx_movies_year_desc" } },
      { collection: "movies", spec: { actors: 1, year: -1 }, options: { background: true, name: "idx_movies_actors_year_compound" } },
      { collection: "movies", spec: { slug: 1 }, options: { unique: true, name: "idx_movies_slug_unique" } },
    ],
    sqlIndexes: [
      "CREATE INDEX IF NOT EXISTS idx_movies_actors_gin ON public.movies USING GIN (actors);",
      "CREATE INDEX IF NOT EXISTS idx_movies_director_gin ON public.movies USING GIN (director);",
      "CREATE INDEX IF NOT EXISTS idx_movies_category_gin ON public.movies USING GIN (category);",
      "CREATE INDEX IF NOT EXISTS idx_movies_year_desc ON public.movies (year DESC);",
      "CREATE INDEX IF NOT EXISTS idx_movies_slug_unique ON public.movies (slug);",
    ],
  };
}

/**
 * 2. CÂU LỆNH AGGREGATION PIPELINE TRÁNH N+1 (MONGODB AGGREGATE)
 * Gom gọn lấy toàn bộ thông tin phim, thể loại và phân trang trong 1 lần gọi duy nhất bằng $facet,
 * tuyệt đối không lặp vòng lặp gọi query con (No N+1 Query Waterfall).
 */
export function buildActorAggregationPipeline(
  variants: string[],
  page = 1,
  limit = 24
) {
  const matchFilter = buildActorMongoQuery(variants);
  const skip = (Math.max(1, page) - 1) * limit;

  return [
    { $match: matchFilter },
    { $sort: { year: -1, _id: -1 } },
    {
      $facet: {
        metadata: [{ $count: "totalItems" }],
        movies: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              origin_name: 1,
              thumb_url: 1,
              poster_url: 1,
              year: 1,
              quality: 1,
              type: 1,
              category: 1,
              actors: 1,
              director: 1,
            },
          },
        ],
      },
    },
  ];
}

/**
 * 1. PHÂN GIẢI NGHỆ SĨ & ALIASES THÔNG MINH (HYBRID TIER 1 + TIER 2 + TIER 3):
 * - TIER 1: Pre-indexed Golden Profiles & Bảng quy đổi đồng nghĩa (Tốc độ 0ms, chính xác 100%).
 * - TIER 2: Smart In-memory Cache L1 (0ms cho các truy vấn đã phân giải trong 7 ngày).
 * - TIER 3: Fast AI Router (Qwen / Groq / Gemini) phân giải ĐỘNG mọi diễn viên/đạo diễn khác trên thế giới (~500ms).
 */
export async function resolveActorMovies(keyword: string): Promise<{
  actorName: string;
  country?: string;
  aliases: string[];
  titles?: string[];
  isActor: boolean;
  source: "preset" | "ai" | "cache" | "none" | "tmdb";
}> {
  if (!keyword || keyword.trim().length < 2) {
    return { actorName: "", aliases: [], isActor: false, source: "none" };
  }

  // 1.0 Kiểm tra an toàn: Nếu là từ khóa ngắn/từ đơn mơ hồ (như "Mai", "An", "Anh"...) mà không có tiền tố diễn viên rõ ràng -> TUYỆT ĐỐI KHÔNG nhận dạng là diễn viên
  if (isAmbiguousShortActorKeyword(keyword)) {
    return { actorName: "", aliases: [], isActor: false, source: "none" };
  }

  // 1.1 Tra cứu trực tiếp Bảng Quy Đổi Đồng Nghĩa (Mapping Table / Synonym Dictionary) (0ms)
  const synonymRes = getActorSynonyms(keyword);
  if (synonymRes.isMatched) {
    return {
      actorName: synonymRes.canonicalName,
      country: synonymRes.country,
      aliases: synonymRes.variants,
      isActor: true,
      source: "preset",
    };
  }

  const cleanRaw = keyword.trim().toLowerCase();
  const normalizedQuery = cleanActorQuery(keyword);

  // 1.2 Kiểm tra TIER 2: Cache L1 (0ms)
  const cached = ACTOR_AI_CACHE.get(cleanRaw) || ACTOR_AI_CACHE.get(normalizedQuery);
  if (cached && cached.expireAt > Date.now()) {
    return {
      actorName: cached.actorName,
      country: cached.country,
      aliases: cached.aliases,
      isActor: cached.isActor,
      source: "cache",
    };
  }

  // 1.25 TIER 2.5: Tra cứu trực tiếp TMDB Search Person (Chuẩn quốc tế, 100% chính xác, không sợ AI nghẽn tải)
  try {
    const words = keyword.trim().split(/\s+/).filter(Boolean);
    const tmdbPerson = await searchTmdbPerson(keyword);
    if (
      tmdbPerson &&
      (tmdbPerson.known_for_department === "Acting" ||
        tmdbPerson.known_for_department === "Directing") &&
      (words.length >= 2 ? tmdbPerson.popularity >= 2.5 : tmdbPerson.popularity >= 15.0)
    ) {
      const actorName = tmdbPerson.name || keyword;
      const aliases = Array.from(
        new Set([actorName, keyword, tmdbPerson.original_name].filter(Boolean))
      ) as string[];

      setBoundedCache(ACTOR_AI_CACHE, cleanRaw, {
        actorName,
        aliases,
        isActor: true,
        expireAt: Date.now() + CACHE_7_DAYS,
      });

      return {
        actorName,
        aliases,
        isActor: true,
        source: "tmdb",
      };
    }
  } catch {}

  // 1.3 TIER 3: Phân tích trực tiếp qua Fast AI (Smart Provider Router)
  try {
    const promptText = `Bạn là Chuyên gia Bách khoa Toàn thư Điện ảnh thế giới (IMDb & TMDB Cast Directory Engine).
Phân tích từ khóa tìm kiếm: "${keyword}" (tên rút gọn: "${normalizedQuery}").

Nhiệm vụ:
1. Xác định xem từ khóa này có phải là tên, biệt danh, hoặc vai diễn nổi tiếng của một DIỄN VIÊN, NGHỆ SĨ, hoặc ĐẠO DIỄN ĐIỆN ẢNH / TRUYỀN HÌNH CÓ THẬT trên thế giới (Ví dụ: "Người sắt" / "iron man" -> Robert Downey Jr, "A Xìn" -> Huỳnh Trấn Thành, "Thành Long" -> Jackie Chan).
2. TRÍCH XUẤT VÀ CHUẨN HÓA VỀ TÊN CHUẨN DUY NHẤT (canonicalName) thường được lưu trữ trong Database (ưu tiên tên tiếng Anh gốc hoặc tên chính thống đầy đủ).

Nếu ĐÚNG là diễn viên/nghệ sĩ/đạo diễn:
- "isActor": true
- "canonicalName": Tên chuẩn duy nhất trong Database (ví dụ: "Robert Downey Jr", "Jackie Chan", "Huỳnh Trấn Thành", "Stephen Chow", "Tom Cruise", "Cillian Murphy", "Song Joong-ki"...).
- "country": Quốc gia / nền điện ảnh chính xác kèm cờ (vd: "Việt Nam 🇻🇳", "Hàn Quốc 🇰🇷", "Hồng Kông 🇭🇰", "Trung Quốc 🇨🇳", "Hollywood 🇺🇸", "Anh Quốc 🇬🇧", "Thái Lan 🇹🇭", "Nhật Bản 🇯🇵").
- "aliases": Mảng các bí danh, tên gọi khác, tên tiếng Việt, nghệ danh phổ biến của nghệ sĩ.

Nếu KHÔNG PHẢI là diễn viên/nghệ sĩ (ví dụ là tên một bộ phim cụ thể như "Titanic", "Inception", "Mai", "Avatar", một thể loại như "phim ma", hoặc từ ngắn/từ đơn thông dụng):
- "isActor": false

QUY TẮC BẮT BUỘC:
- Các từ khóa ngắn hoặc từ đơn (như "Mai", "An", "Anh", "Hoa", "Nam", "Avatar", "Titanic") có thể là tên phim hoặc từ thông dụng, tuyệt đối TRẢ VỀ isActor: false.
- Chỉ trả về isActor: true khi từ khóa là tên đầy đủ, nghệ danh rõ ràng của diễn viên/đạo diễn nổi tiếng (ví dụ: 'Trấn Thành', 'Thành Long', 'Châu Tinh Trì', 'Tom Cruise').

BẮT BUỘC chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{
  "isActor": true,
  "canonicalName": "Tên chuẩn duy nhất",
  "country": "Quốc gia",
  "aliases": ["tên 1", "tên 2", "tên 3"]
}`;

    const aiRes = await generateFastAiChat({
      systemPrompt: "Bạn là chuyên gia bách khoa toàn thư điện ảnh thế giới. Bắt buộc chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ.",
      userPrompt: promptText,
      temperature: 0.1,
      maxTokens: 400,
      jsonMode: true,
      timeoutMs: 6500,
    });

    if (aiRes && aiRes.text) {
      const cleaned = aiRes.text.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.isActor) {
          const actorName = parsed.canonicalName || parsed.actorName || keyword;
          const country = parsed.country || undefined;
          const rawAliases = Array.isArray(parsed.aliases) ? parsed.aliases : [];
          const aliases = Array.from(new Set([actorName, keyword, ...rawAliases])).filter(
            (s): s is string => typeof s === "string" && s.trim().length >= 2
          );

          setBoundedCache(ACTOR_AI_CACHE, cleanRaw, {
            actorName,
            country,
            aliases,
            isActor: true,
            expireAt: Date.now() + CACHE_7_DAYS,
          });

          return {
            actorName,
            country,
            aliases,
            isActor: true,
            source: "ai",
          };
        } else {
          setBoundedCache(ACTOR_AI_CACHE, cleanRaw, {
            actorName: "",
            aliases: [],
            isActor: false,
            expireAt: Date.now() + 24 * 60 * 60 * 1000,
          });
        }
      }
    }
  } catch (err) {
    console.warn("[aiActorService] Fast AI resolution error:", err);
  }

  return {
    actorName: "",
    aliases: [],
    isActor: false,
    source: "none",
  };
}

/**
 * Trích xuất toàn bộ diễn viên, đạo diễn từ mọi biến thể tên trường trong Database (actor, actors, casts, cast, director, directors)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractItemActorsAndDirectors(item: any): string[] {
  if (!item) return [];
  const list: string[] = [];

  const rawActors = item.actor || item.actors || item.casts || item.cast;
  if (Array.isArray(rawActors)) {
    for (const a of rawActors) {
      if (typeof a === "string") list.push(a);
      else if (a && typeof a === "object") list.push(a.name || a.slug || "");
    }
  } else if (typeof rawActors === "string") {
    list.push(...rawActors.split(",").map((s) => s.trim()));
  }

  const rawDirectors = item.director || item.directors || item.dao_dien;
  if (Array.isArray(rawDirectors)) {
    for (const d of rawDirectors) {
      if (typeof d === "string") list.push(d);
      else if (d && typeof d === "object") list.push(d.name || d.slug || "");
    }
  } else if (typeof rawDirectors === "string") {
    list.push(...rawDirectors.split(",").map((s) => s.trim()));
  }

  return list.map((s) => s.trim()).filter(Boolean);
}

/**
 * So khớp diễn viên nghiêm ngặt và toàn diện (Case-insensitive & Regex Match)
 * 1. Chuyển đổi toàn bộ về chữ thường và chuẩn hóa không dấu.
 * 2. So khớp trực tiếp (Direct case-insensitive equality).
 * 3. So khớp bằng biểu thức chính quy (Regex) với ranh giới từ (word boundary)
 *    để nhận diện chính xác mọi biến thể ('Jackie Chan', 'jackie chan', 'JACKIE CHAN',
 *    'Jackie Chan (Thành Long)', 'Chan Kong-sang') mà không bị nhầm lẫn với các từ ngắn (như 'Bạch Long').
 */
export function matchesActorAliases(castList: string[], aliases: string[]): boolean {
  if (!Array.isArray(castList) || castList.length === 0) return false;
  if (!Array.isArray(aliases) || aliases.length === 0) return false;

  for (const rawActor of castList) {
    if (!rawActor || typeof rawActor !== "string") continue;
    const actorLower = rawActor.toLowerCase().trim();
    const actorNorm = normalizeForMatch(rawActor);
    if (!actorLower || actorLower.length < 2) continue;

    for (const rawAlias of aliases) {
      if (!rawAlias || typeof rawAlias !== "string") continue;
      const aliasLower = rawAlias.toLowerCase().trim();
      const aliasNorm = normalizeForMatch(rawAlias);
      if (!aliasLower || aliasLower.length < 2) continue;

      // 1. So khớp tuyệt đối trực tiếp không phân biệt hoa/thường (Case-insensitive Direct Match)
      if (actorLower === aliasLower || actorNorm === aliasNorm) {
        return true;
      }

      const isMultiWord = aliasLower.includes(" ") || aliasNorm.includes(" ") || aliasLower.includes("-");
      if (isMultiWord) {
        // 2. Cụm từ đầy đủ (ví dụ: 'jackie chan', 'thành long', 'chan kong-sang', 'duong mich', 'stephen chow'):
        // So khớp chứa chuỗi (contains) hoặc dùng Regex ranh giới từ
        if (actorNorm.includes(aliasNorm) || actorLower.includes(aliasLower)) {
          return true;
        }

        try {
          const regexNorm = new RegExp("(^|[^a-z0-9])" + escapeRegex(aliasNorm) + "($|[^a-z0-9])", "i");
          if (regexNorm.test(actorNorm)) {
            return true;
          }
          const regexLower = new RegExp("(^|[^a-z0-9])" + escapeRegex(aliasLower) + "($|[^a-z0-9])", "i");
          if (regexLower.test(actorLower)) {
            return true;
          }
        } catch {}
      } else {
        // 3. Từ đơn lẻ / nickname ngắn (ví dụ: 'iu', 'dilraba'):
        // Bắt buộc so khớp chính xác toàn bộ tên diễn viên (tránh 'kan xin' dính 'xìn', 'bạch long' dính 'long')
        // hoặc tên nghệ danh ghi rõ ràng trong ngoặc đơn: vd "Lee Ji-eun (IU)"
        if (actorLower === aliasLower || actorNorm === aliasNorm) {
          return true;
        }
        if (actorLower.includes(`(${aliasLower})`) || actorNorm.includes(`(${aliasNorm})`)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * 2. TRUY VẤN ĐỘNG TOÀN BỘ PHIM THEO DIỄN VIÊN / ĐẠO DIỄN TỪ DATABASE (DYNAMIC CAST QUERY)
 * Sử dụng danh sách aliases đa biến thể từ Bảng quy đổi để truy vấn thẳng vào trường cast/actors/director trong database.
 * TỐI ƯU HÓA CAO ĐỘ (HIGH PERFORMANCE & ZERO N+1):
 * 1. Tự động xác thực các phim thuộc Danh bạ kinh điển mà KHÔNG cần gọi chi tiết (tiết kiệm 40+ HTTP calls).
 * 2. Quét song song tất cả các tiêu đề và biến thể tên trong 1 đợt duy nhất (thay vì lặp tuần tự).
 * 3. Bounded Detail Probing: Chỉ kiểm tra tối đa 15 phim chưa xác định trong 1 đợt song song có timeout.
 * 4. SWR In-Memory Cache: Phản hồi 0ms cho các lần truy cập tiếp theo hoặc khi chuyển trang.
 */
export async function queryMoviesByActor(
  actorName: string,
  aliases: string[] = [],
  country?: string,
  maxMovies = 250
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (!actorName && aliases.length === 0) return [];

  // 1. Tra cứu trực tiếp Bảng quy đổi đồng nghĩa (Mapping Table) để lấy trọn bộ biến thể
  const synonymRes = getActorSynonyms(actorName);
  const matchedSlug = synonymRes.isMatched ? synonymRes.slug : "";
  const extraVariants: string[] = synonymRes.isMatched ? [...synonymRes.variants] : [];

  if (synonymRes.country && !country) {
    country = synonymRes.country;
  }

  const allVariants = Array.from(
    new Set(
      [actorName, ...aliases, ...extraVariants]
        .filter((s): s is string => typeof s === "string" && s.trim().length >= 2)
        .map((s) => s.trim())
    )
  );

  const normalizedVariants = Array.from(new Set(allVariants.map(normalizeForMatch).filter(Boolean)));
  const cacheKey = `ACTOR_QUERY_V5:${matchedSlug || normalizedVariants.sort().join("|")}`;

  // 2. Cơ chế SWR Cache (Stale-While-Revalidate - Phản hồi 0ms tức thì)
  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  const now = Date.now();
  if (cached) {
    if (cached.expireAt > now) {
      // Dữ liệu tươi mới -> trả về tức thì 0ms
      return cached.items.slice(0, maxMovies);
    } else if (cached.staleUntil > now) {
      // Dữ liệu cũ còn hạn dùng tạm -> trả về ngay lập tức 0ms và tự động revalidate ngầm
      setTimeout(() => {
        executeActorFilmQuery(actorName, allVariants, matchedSlug, synonymRes, maxMovies, cacheKey).catch(() => {});
      }, 100);
      return cached.items.slice(0, maxMovies);
    }
  }

  const kvKey = `actor:filmography:${matchedSlug || actorName}:${maxMovies}`;
  return await kvCache.fetchOrSet(
    kvKey,
    () => executeActorFilmQuery(actorName, allVariants, matchedSlug, synonymRes, maxMovies, cacheKey),
    14 * 86400 // 14 ngày
  );
}

async function executeActorFilmQuery(
  actorName: string,
  allVariants: string[],
  matchedSlug: string,
  synonymRes: ActorSynonymResult,
  maxMovies: number,
  cacheKey: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  // =========================================================================
  // TMDB FILMOGRAPHY MATCHING ENGINE (ƯU TIÊN HÀNG ĐẦU):
  // 1. Dùng TMDB làm nguồn chuẩn xác định toàn bộ filmography của diễn viên (movie_credits)
  // 2. Lấy tmdb_id của từng phim
  // 3. Đối chiếu TMDB ID với KKPhim và NguonC theo thứ tự ưu tiên:
  //    TMDB ID → IMDB ID → Title + Year
  // 4. Merge về format Movie chuẩn của dự án và hiển thị trên MovieGrid
  // =========================================================================
  try {
    const tmdbMovies = await getActorFilmographyFromTmdb(
      actorName,
      synonymRes.canonicalName || actorName,
      allVariants,
      maxMovies
    );
    if (tmdbMovies && tmdbMovies.length > 0) {
      const enrichedMovies = tmdbMovies.map((m) => ({
        ...m,
        actor: Array.isArray(m.actor) && m.actor.length > 0
          ? m.actor
          : [synonymRes.canonicalName || actorName],
      }));
      ACTOR_FILM_CACHE.set(cacheKey, {
        items: enrichedMovies,
        expireAt: Date.now() + CACHE_7_DAYS,
        staleUntil: Date.now() + CACHE_7_DAYS * 2,
      });
      return enrichedMovies;
    }
  } catch (tmdbErr) {
    console.warn("[aiActorService] TMDB filmography matching failed, falling back to database query:", tmdbErr);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidateItems: any[] = [];
  const seenSlugs = new Set<string>();

  // =========================================================================
  // 100% DYNAMIC QUERY DỰA TRÊN TÊN CHUẨN (CANONICAL NAME) & BIẾN THỂ (ALIAS DICTIONARY)
  // TUYỆT ĐỐI KHÔNG DÙNG DANH SÁCH PHIM HARDCODE (NO HARDCODED MOVIE TITLES)
  // =========================================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchPromises: Promise<any>[] = [];

  const canonicalTarget = synonymRes.canonicalName || actorName;
  const englishTarget = synonymRes.englishName;

  // Thu thập các từ khóa tên chuẩn và bí danh để query động vào Database API
  const searchKeywords = Array.from(
    new Set(
      [
        canonicalTarget,
        englishTarget,
        actorName,
        ...allVariants.filter((v) => v.trim().includes(" ") || v.trim().length >= 4),
      ].filter((k): k is string => Boolean(k && k.trim().length >= 3))
    )
  ).slice(0, 4);

  for (const kw of searchKeywords) {
    searchPromises.push(movieApi.getMovies({ keyword: kw.trim(), page: 1, limit: 30 }));
    searchPromises.push(movieApi.getMovies({ keyword: kw.trim(), page: 2, limit: 30 }));
  }

  // Chờ tất cả kết quả tìm kiếm ứng viên đồng thời (1 đợt duy nhất, loại bỏ vòng lặp tuần tự N+1)
  const searchResults = await Promise.allSettled(searchPromises);
  for (const r of searchResults) {
    if (r.status === "fulfilled" && Array.isArray(r.value?.items)) {
      for (const item of r.value.items) {
        if (!item || !item.slug || seenSlugs.has(item.slug)) continue;
        seenSlugs.add(item.slug);
        candidateItems.push(item);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verifiedMovies: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const needDetailCheck: any[] = [];

  // =========================================================================
  // NGUYÊN TẮC STRICT ACTOR MAPPING (BẮT BUỘC):
  // 1. TUYỆT ĐỐI CẤM QUÉT TIÊU ĐỀ PHIM (Title Search) hoặc mô tả (description).
  // 2. CHỈ QUERY CHÍNH XÁC TRÊN MẢNG NHÂN SỰ (actors, actor, casts, cast, director).
  // 3. LOẠI BỎ TOÀN BỘ KẾT QUẢ MẬP MỜ: Mọi bộ phim bắt buộc phải có tên nghệ sĩ trong mảng nhân sự thực tế.
  //    (Nếu phim chỉ có tên trùng chữ ngẫu nhiên như 'Trấn', 'Thành', 'Bố Già' nhưng mảng actors
  //    không có nghệ sĩ thì HỆ THỐNG LOẠI BỎ HOÀN TOÀN, không có bất kỳ ngoại lệ nào).
  // =========================================================================
  for (const item of candidateItems) {
    const castAndDirectors = extractItemActorsAndDirectors(item);
    if (castAndDirectors.length > 0) {
      // Đã có sẵn dữ liệu mảng nhân sự trong summary: Kiểm tra trực tiếp
      if (matchesActorAliases(castAndDirectors, allVariants)) {
        verifiedMovies.push({
          ...item,
          isActorFilmography: true,
        });
      }
      // Đã có mảng nhân sự mà KHÔNG chứa nghệ sĩ -> BỎ QUA HOÀN TOÀN, TUYỆT ĐỐI KHÔNG DÙNG TIÊU ĐỀ
    } else {
      // Summary từ API chưa có mảng nhân sự -> Đưa vào danh sách kiểm tra chi tiết
      needDetailCheck.push(item);
    }
  }

  // BOUNDED PARALLEL DETAIL PROBING:
  // Lấy chi tiết song song (tối đa 40 phim ứng viên) để kiểm tra mảng nhân sự thực tế từ detail.movie
  const DETAIL_MAX_CHECKS = 40;
  const candidatesToCheck = needDetailCheck.slice(0, DETAIL_MAX_CHECKS);
  if (candidatesToCheck.length > 0) {
    const detailResults = await Promise.allSettled(
      candidatesToCheck.map(async (item) => {
        try {
          const detail = await Promise.race([
            movieApi.getMovieDetail(item.slug),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
          ]);
          if (!detail?.movie) return null;
          const detailCast = extractItemActorsAndDirectors(detail.movie);
          // STRICT ACTOR MAPPING: Chỉ chấp nhận nếu mảng actors / casts / directors thực tế chứa nghệ sĩ
          const isMatch = matchesActorAliases(detailCast, allVariants);
          if (isMatch) {
            return {
              ...item,
              actor: detail.movie.actor,
              director: detail.movie.director,
              isActorFilmography: true,
            };
          }
        } catch {}
        return null;
      })
    );

    for (const r of detailResults) {
      if (r.status === "fulfilled" && r.value) {
        verifiedMovies.push(r.value);
      }
    }
  }

  // Khử trùng lặp slug
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueMap = new Map<string, any>();
  for (const m of verifiedMovies) {
    if (m?.slug && !uniqueMap.has(m.slug)) {
      uniqueMap.set(m.slug, m);
    }
  }

  const finalResults = Array.from(uniqueMap.values());

  // Sắp xếp ưu tiên phim mới nhất (năm giảm dần)
  finalResults.sort((a, b) => {
    const yearA = parseInt(String(a.year || "0"), 10) || 0;
    const yearB = parseInt(String(b.year || "0"), 10) || 0;
    return yearB - yearA;
  });

  const clampedResults = finalResults.slice(0, maxMovies);

  if (clampedResults.length > 0) {
    setBoundedCache(ACTOR_FILM_CACHE, cacheKey, {
      items: clampedResults,
      expireAt: Date.now() + 12 * 60 * 60 * 1000, // 12h Fresh TTL
      staleUntil: Date.now() + 48 * 60 * 60 * 1000, // 48h Stale TTL
    });
  }

  return clampedResults;
}

async function runTitlesWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (true) {
      const idx = currentIndex++;
      if (idx >= items.length) break;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch {
        // Safe skip on error
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function searchPhimApiForTitle(keyword: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=6`,
      { signal: AbortSignal.timeout(2400), next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const imageDomain =
      json.data?.APP_DOMAIN_CDN_IMAGE ||
      json.data?.APP_DOMAIN_FRONTEND ||
      "https://phimimg.com/";
    const cdnClean = imageDomain.replace(/\/+$/, "");
    const items = json.data?.items || json.items || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return items.map((item: any) => {
      const rawThumb = typeof item.thumb_url === "string" ? item.thumb_url.trim() : "";
      const rawPoster = typeof item.poster_url === "string" ? item.poster_url.trim() : "";
      const formatImg = (path: string) => {
        if (!path) return "";
        if (path.startsWith("http://") || path.startsWith("https://")) return path;
        return `${cdnClean}/${path.replace(/^\/+/, "")}`;
      };
      const formattedThumb = formatImg(rawThumb);
      const formattedPoster = formatImg(rawPoster);
      return {
        ...item,
        thumb_url: formattedThumb || formattedPoster,
        poster_url: formattedPoster || formattedThumb,
      };
    });
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function searchNguonCForTitle(keyword: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(keyword)}&page=1`,
      { signal: AbortSignal.timeout(2400), next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawItems: any[] = json.items || json.data?.items || [];
    return rawItems.map((item) => ({
      ...item,
      origin_name: item.original_name || item.name,
      poster_url: item.poster_url || item.thumb_url || "",
      thumb_url: item.thumb_url || item.poster_url || "",
      quality: item.quality || "HD",
      lang: item.language || "Vietsub",
      year: Number(item.year) || undefined,
    }));
  } catch {
    return [];
  }
}

export interface FetchMoviesOptions {
  actorName?: string;
  actorAliases?: string[];
  country?: string;
  strictActorFilter?: boolean;
}

export async function fetchMoviesByTitles(
  titles: string[],
  maxMovies = 16,
  options?: FetchMoviesOptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (!titles || titles.length === 0) return [];

  const topTitles = titles.slice(0, 14);
  const cacheKey = `${options?.actorName || ""}|${topTitles.join("|")}`;
  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.items.slice(0, maxMovies);
  }

  const kvKey = `movie:by_titles:${cacheKey}`;
  return await kvCache.fetchOrSet(
    kvKey,
    async () => {
      const seenSlugs = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = [];

  const allAliases = [options?.actorName, ...(options?.actorAliases || [])]
    .filter((s): s is string => typeof s === "string" && s.trim().length >= 2)
    .map(normalizeForMatch);

  // Thực thi tìm kiếm có kiểm soát concurrency (tối đa 6 worker đồng thời)
  // Ưu tiên gọi PhimAPI trước, chỉ fallback sang NguonC khi PhimAPI không khớp
  const resolvedItems = await runTitlesWithConcurrencyLimit(topTitles, 6, async (rawTitle) => {
    try {
      const viTitle = rawTitle.replace(/\([^)]*\)/g, "").trim();
      const matchEng = rawTitle.match(/\(([^)]+)\)/);
      const engPart = matchEng ? matchEng[1].trim() : "";
      const matchYear = rawTitle.match(/\b(19\d\d|20\d\d)\b/);
      const targetYear = matchYear ? parseInt(matchYear[1], 10) : undefined;
      const engTitle = engPart.replace(/\b(19\d\d|20\d\d)\b/g, "").replace(/,/g, "").trim();

      const cleanTargetVi = normalizeForMatch(viTitle);
      const cleanTargetEng = normalizeForMatch(engTitle);

      if (!cleanTargetVi && !cleanTargetEng) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evaluateCandidates = (candidates: any[]): any | null => {
        let bestItem = null;
        let highestScore = -1;

        for (const item of candidates) {
          if (!item || !item.slug || seenSlugs.has(item.slug)) continue;

          const normName = normalizeForMatch(item.name);
          const normOrig = normalizeForMatch(item.origin_name);
          const itemCountry = normalizeForMatch(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Array.isArray(item.country) ? item.country.map((c: any) => c.name || c.slug || "").join(" ") : typeof item.country === "string" ? item.country : ""
          );

          // Trích xuất toàn bộ diễn viên (cast) và đạo diễn (director)
          const itemActorsAndDirectors: string[] = [];
          if (Array.isArray(item.actor)) itemActorsAndDirectors.push(...item.actor);
          else if (typeof item.actor === "string") itemActorsAndDirectors.push(item.actor);
          if (Array.isArray(item.director)) itemActorsAndDirectors.push(...item.director);
          else if (typeof item.director === "string") itemActorsAndDirectors.push(item.director);
          const fullCastStr = normalizeForMatch(itemActorsAndDirectors.join(" "));

          const hasActorOrDirector = allAliases.length > 0 && allAliases.some((alias) => fullCastStr.includes(alias));

          // 1. STRICT COUNTRY FILTER: Nếu tìm kiếm nghệ sĩ Việt Nam (hoặc quốc gia khác), loại trừ phim từ các quốc gia không tương thích nếu nghệ sĩ không có trong dàn cast/director
          if (options?.country) {
            const normExpectedCountry = normalizeForMatch(options.country);
            const isVietnamTarget = normExpectedCountry.includes("viet nam");
            const isForeignMovie =
              itemCountry.includes("au my") ||
              itemCountry.includes("my") ||
              itemCountry.includes("anh") ||
              itemCountry.includes("phap") ||
              itemCountry.includes("han quoc") ||
              itemCountry.includes("trung quoc") ||
              itemCountry.includes("nhat ban");

            if (isVietnamTarget && isForeignMovie && !hasActorOrDirector) {
              continue; // Bỏ qua ngay lập tức
            }
          }

          // 2. STRICT ACTOR/DIRECTOR CHECK: Nếu có danh sách diễn viên cụ thể mà strictActorFilter bật và không có nghệ sĩ
          if (options?.strictActorFilter && itemActorsAndDirectors.length > 0 && !hasActorOrDirector) {
            const isExactTitleMatch = (cleanTargetVi && normName === cleanTargetVi) || (cleanTargetEng && (normOrig === cleanTargetEng || normName === cleanTargetEng));
            if (!isExactTitleMatch) {
              continue;
            }
          }

          let score = 0;

          // Khớp tuyệt đối 100% tên chính
          const isExactVi = cleanTargetVi && (normName === cleanTargetVi || normOrig === cleanTargetVi);
          const isExactEng = cleanTargetEng && (normName === cleanTargetEng || normOrig === cleanTargetEng);

          if (isExactVi) {
            score = 100;
          } else if (isExactEng) {
            score = 95;
          } else {
            // Khớp bao hàm
            const isShortTitle = cleanTargetVi.length < 8 || cleanTargetEng.length < 8;
            if (isShortTitle && !hasActorOrDirector) {
              continue;
            }

            if (cleanTargetVi && (normName.includes(cleanTargetVi) || cleanTargetVi.includes(normName))) {
              score = 60;
            } else if (cleanTargetEng && (normOrig.includes(cleanTargetEng) || cleanTargetEng.includes(normOrig))) {
              score = 55;
            } else {
              // So khớp từ khóa
              const targetWords = (cleanTargetVi || cleanTargetEng).split(" ").filter((w) => w.length > 1);
              if (targetWords.length > 0) {
                const matchedWords = targetWords.filter(
                  (w) => normName.includes(w) || normOrig.includes(w)
                );
                const ratio = matchedWords.length / targetWords.length;
                if (ratio >= 0.7) score = Math.round(ratio * 40);
              }
            }
          }

          // Ưu tiên cực lớn nếu nghệ sĩ có trong cast/director
          if (hasActorOrDirector) {
            score += 60;
          }

          // Điểm thưởng / phạt năm phát hành
          if (targetYear && item.year) {
            const itemY = parseInt(String(item.year), 10);
            if (!isNaN(itemY)) {
              if (itemY === targetYear) {
                score += 15;
              } else if (Math.abs(itemY - targetYear) <= 1) {
                score += 5;
              } else if (Math.abs(itemY - targetYear) > 3) {
                score -= 20;
              }
            }
          }

          if (score >= 50 && score > highestScore) {
            highestScore = score;
            bestItem = item;
          }
        }

        return bestItem;
      };

      // 2.1 Ưu tiên tìm kiếm PhimAPI trước
      let phimApiItems = cleanTargetVi.length >= 2 ? await searchPhimApiForTitle(viTitle) : [];
      if (phimApiItems.length === 0 && engTitle && cleanTargetEng.length >= 2) {
        phimApiItems = await searchPhimApiForTitle(engTitle);
      }

      const matched = evaluateCandidates(phimApiItems);
      if (matched) {
        return matched; // Đã match trên PhimAPI, KHÔNG gọi NguonC
      }

      // 2.2 CHỈ FALLBACK SANG NGUONC khi PhimAPI không tìm thấy hoặc không khớp
      let nguonCItems = cleanTargetVi.length >= 2 ? await searchNguonCForTitle(viTitle) : [];
      if (nguonCItems.length === 0 && engTitle && cleanTargetEng.length >= 2) {
        nguonCItems = await searchNguonCForTitle(engTitle);
      }

      return evaluateCandidates(nguonCItems);
    } catch (err) {
      console.warn(`[aiActorService] Error searching title "${rawTitle}":`, err);
      return null;
    }
  });

  for (const item of resolvedItems) {
    if (item && item.slug && !seenSlugs.has(item.slug)) {
      seenSlugs.add(item.slug);
      results.push(item);
      if (results.length >= maxMovies) break;
    }
  }

      if (results.length > 0) {
        setBoundedCache(ACTOR_FILM_CACHE, cacheKey, {
          items: results,
          expireAt: Date.now() + 24 * 60 * 60 * 1000,
          staleUntil: Date.now() + 48 * 60 * 60 * 1000,
        });
      }

      return results;
    },
    7 * 86400 // 7 ngày trên Cloudflare KV
  );
}
