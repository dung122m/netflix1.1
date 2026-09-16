import { movieApi } from "@/services/movieApi";
import { generateFastAiChat } from "@/services/aiProviderService";

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
    aliases: ["tran thanh", "xìn", "mc tran thanh", "dao dien tran thanh"],
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
    aliases: ["thanh long", "jackie chan"],
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

// In-memory cache cho danh sách phim đã tìm thấy từ kho (TTL: 24 giờ)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTOR_FILM_CACHE = new Map<string, { items: any[]; expireAt: number }>();

function setBoundedCache<K, V>(map: Map<K, V>, key: K, value: V, max = 500) {
  if (map.size >= max) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, value);
}

/**
 * Chuẩn hoá chuỗi để so khớp không dấu
 */
export function normalizeForMatch(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanActorQuery(query: string): string {
  return (query || "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^phim\s+cua\s+/gi, "")
    .replace(/^phim\s+/gi, "")
    .replace(/^dien\s+vien\s+/gi, "")
    .replace(/^xem\s+phim\s+/gi, "")
    .replace(/^tuyen\s+tap\s+phim\s+(?:cua\s+)?/gi, "")
    .replace(/\s+dong$/gi, "")
    .replace(/\s+dien\s+xuat$/gi, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 1. PHÂN GIẢI NGHỆ SĨ & ALIASES THÔNG MINH (HYBRID TIER 1 + TIER 2 + TIER 3):
 * - TIER 1: Pre-indexed Golden Profiles cho các diễn viên/nghệ sĩ phổ biến (Tốc độ 0ms, chính xác 100%).
 * - TIER 2: Smart In-memory Cache L1 (0ms cho các truy vấn đã phân giải trong 7 ngày).
 * - TIER 3: Fast AI Router (Qwen / Groq / Gemini) phân giải ĐỘNG mọi diễn viên/đạo diễn khác trên thế giới (~500ms).
 */
export async function resolveActorMovies(keyword: string): Promise<{
  actorName: string;
  country?: string;
  aliases: string[];
  titles?: string[];
  isActor: boolean;
  source: "preset" | "ai" | "cache" | "none";
}> {
  if (!keyword || keyword.trim().length < 2) {
    return { actorName: "", aliases: [], isActor: false, source: "none" };
  }

  const cleanRaw = keyword.trim().toLowerCase();
  const normalizedQuery = cleanActorQuery(keyword);

  // 1.1 Kiểm tra TIER 1: Danh bạ Pre-indexed Golden Profiles (0ms)
  const matchedPreset = GOLDEN_ACTOR_INDEX.find((profile) => {
    const normName = normalizeForMatch(profile.name);
    if (normalizedQuery === normName || cleanRaw === profile.name.toLowerCase()) return true;
    return profile.aliases.some((alias) => {
      const normAlias = normalizeForMatch(alias);
      return normalizedQuery === normAlias || cleanRaw === alias.toLowerCase();
    });
  });

  if (matchedPreset) {
    return {
      actorName: matchedPreset.name,
      country: matchedPreset.country,
      aliases: matchedPreset.aliases,
      isActor: true,
      source: "preset",
    };
  }

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

  // 1.3 TIER 3: Phân tích trực tiếp qua Fast AI (Smart Provider Router)
  try {
    const promptText = `Bạn là Chuyên gia Bách khoa Toàn thư Điện ảnh thế giới (IMDb & TMDB Cast Directory Engine).
Phân tích từ khóa tìm kiếm: "${keyword}" (tên rút gọn: "${normalizedQuery}").

Nhiệm vụ:
Xác định xem từ khóa này có phải là tên của một DIỄN VIÊN, NGHỆ SĨ, hoặc ĐẠO DIỄN ĐIỆN ẢNH / TRUYỀN HÌNH CÓ THẬT trên thế giới (Việt Nam, Hollywood, Hàn Quốc, TVB Hồng Kông, Trung Quốc, Thái Lan, Nhật Bản, Châu Âu, Anime, v.v.) hay không.

Nếu ĐÚNG là diễn viên/nghệ sĩ/đạo diễn:
- "isActor": true
- "actorName": Tên chuẩn phổ biến nhất của nghệ sĩ (ví dụ: Trường Giang, Trấn Thành, Châu Tinh Trì, Dương Mịch, Benedict Cumberbatch, Cillian Murphy, Son Ye-jin, Song Kang, Baifern Pimchanok, Tom Cruise...).
- "country": Quốc gia / nền điện ảnh chính xác kèm cờ (vd: "Việt Nam 🇻🇳", "Hàn Quốc 🇰🇷", "Hồng Kông 🇭🇰", "Trung Quốc 🇨🇳", "Hollywood 🇺🇸", "Anh Quốc 🇬🇧", "Thái Lan 🇹🇭", "Nhật Bản 🇯🇵").
- "aliases": Mảng các bí danh, tên gọi khác, tên tiếng Anh, nghệ danh phổ biến của nghệ sĩ.

Nếu KHÔNG PHẢI là diễn viên/nghệ sĩ (ví dụ là tên một bộ phim cụ thể như "Titanic", "Inception", một thể loại như "phim ma", hoặc từ vô nghĩa):
- "isActor": false

BẮT BUỘC chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{
  "isActor": true,
  "actorName": "Tên chuẩn",
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
          const actorName = parsed.actorName || keyword;
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

// Bảng ánh xạ slug và bí danh diễn viên quốc tế & Việt Nam (ACTOR_SLUG_MAP)
export const ACTOR_SLUG_MAP: Record<string, string[]> = {
  "thanh-long": ["thanh long", "thành long", "jackie chan", "chan kong sang", "sing lung"],
  "chau-tinh-tri": ["chau tinh tri", "châu tinh trì", "stephen chow", "chow sing chi", "tinh gia"],
  "chan-tu-dan": ["chan tu dan", "chân tử đan", "donnie yen", "yen ji dan"],
  "ly-lien-kiet": ["ly lien kiet", "lý liên kiệt", "jet li", "li lian jie"],
  "ngo-kinh": ["ngo kinh", "ngô kinh", "wu jing"],
  "luu-duc-hoa": ["luu duc hoa", "lưu đức hoa", "andy lau"],
  "luong-trieu-vy": ["luong trieu vy", "lương triều vỹ", "tony leung"],
  "quach-phu-thanh": ["quach phu thanh", "quách phú thành", "aaron kwok"],
  "co-thien-lac": ["co thien lac", "cổ thiên lạc", "louis koo"],
  "truong-gia-huy": ["truong gia huy", "trương gia huy", "nick cheung"],
  "ta-dinh-phong": ["ta dinh phong", "tạ đình phong", "nicholas tse"],
  "hong-kim-bao": ["hong kim bao", "hồng kim bảo", "sammo hung"],
  "nguyen-biao": ["nguyen biao", "nguyên tiêu", "yuen biao"],
  "tran-thanh": ["tran thanh", "trấn thành", "mc tran thanh", "xìn", "dao dien tran thanh"],
  "truong-giang": ["truong giang", "trường giang", "mc truong giang", "mười khó", "muoi kho"],
  "thai-hoa": ["thai hoa", "thái hòa", "ong hoang phong ve thai hoa"],
  "ninh-duong-lan-ngoc": ["ninh duong lan ngoc", "ninh dương lan ngọc", "lan ngoc"],
  "kieu-minh-tuan": ["kieu minh tuan", "kiều minh tuấn"],
  "thu-trang": ["thu trang", "hoa hau hai thu trang", "chi muoi ba"],
  "ly-hai": ["ly hai", "lý hải", "dao dien ly hai", "lat mat"],
  "hoai-linh": ["hoai linh", "hoài linh", "sau sang"],
  "viet-huong": ["viet huong", "việt hương"],
  "tuan-tran": ["tuan tran", "tuấn trần"],
  "miu-le": ["miu le", "miu lê"],
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
  "song-joong-ki": ["song joong ki", "song joong-ki"],
  "kim-soo-hyun": ["kim soo hyun", "kim soo-hyun"],
  "hyun-bin": ["hyun bin", "hyeon bin"],
  "lee-min-ho": ["lee min ho", "lee min-ho"],
  "park-seo-joon": ["park seo joon", "park seo-jun"],
  "son-ye-jin": ["son ye jin", "son ye-jin"],
  "kim-ji-won": ["kim ji won", "kim ji-won", "hong hae in"],
  "song-kang": ["song kang"],
  "iu": ["iu", "lee ji eun", "lee ji-eun"],
  "huynh-hieu-minh": ["huynh hieu minh", "huỳnh hiểu minh", "huang xiaoming"],
  "trieu-le-dinh": ["trieu le dinh", "triệu lệ dĩnh", "zhao liying"],
  "duong-mich": ["duong mich", "dương mịch", "yang mi"],
  "dich-le-nhiet-ba": ["dich le nhiet ba", "địch lệ nhiệt ba", "dilraba dilmurat"],
  "tieu-chien": ["tieu chien", "tiêu chiến", "xiao zhan"],
  "vuong-nhat-bac": ["vuong nhat bac", "vương nhất bác", "wang yibo"],
};

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
 * 2. TRUY VẤN ĐỘNG TOÀN BỘ PHIM THEO DIỄN VIÊN / ĐẠO DIỄN TỪ DATABASE (DYNAMIC CAST QUERY)
 * Sử dụng danh sách aliases để truy vấn thẳng vào trường cast/actors/director trong database.
 * Trả về toàn bộ danh sách phim thực tế khớp trong database (không giới hạn cứng 6 phim).
 */
export async function queryMoviesByActor(
  actorName: string,
  aliases: string[] = [],
  country?: string,
  maxMovies = 60
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (!actorName && aliases.length === 0) return [];

  // Tự động làm giàu danh sách bí danh từ ACTOR_SLUG_MAP & GOLDEN_ACTOR_INDEX
  const normalizedKey = normalizeForMatch(actorName);
  const extraAliases: string[] = [];

  for (const [slug, mapAliases] of Object.entries(ACTOR_SLUG_MAP)) {
    const normSlug = slug.replace(/-/g, " ");
    const matchesThis =
      normalizedKey === normSlug ||
      mapAliases.some((a) => normalizeForMatch(a) === normalizedKey || normalizedKey.includes(normalizeForMatch(a)));
    if (matchesThis) {
      extraAliases.push(...mapAliases);
    }
  }

  for (const preset of GOLDEN_ACTOR_INDEX) {
    const normPName = normalizeForMatch(preset.name);
    if (normPName === normalizedKey || preset.aliases.some((a) => normalizeForMatch(a) === normalizedKey)) {
      extraAliases.push(preset.name, ...preset.aliases);
      if (!country && preset.country) country = preset.country;
    }
  }

  const allAliases = Array.from(
    new Set(
      [actorName, ...aliases, ...extraAliases]
        .filter((s): s is string => typeof s === "string" && s.trim().length >= 2)
        .map((s) => s.trim())
    )
  );

  const normalizedAliases = Array.from(new Set(allAliases.map(normalizeForMatch).filter(Boolean)));
  const cacheKey = `ACTOR_QUERY:${normalizedAliases.sort().join("|")}`;
  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.items.slice(0, maxMovies);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryPromises: Promise<any>[] = [];

  // Truy vấn song song các biến thể tên chính và tên tiếng Anh/quốc tế
  const searchQueries = allAliases.slice(0, 5);
  for (const alias of searchQueries) {
    queryPromises.push(movieApi.getMovies({ keyword: alias, page: 1, limit: 30 }));
    queryPromises.push(movieApi.getMovies({ keyword: alias, page: 2, limit: 30 }));
  }

  const queryResults = await Promise.allSettled(queryPromises);
  const seenSlugs = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchedMovies: any[] = [];

  for (const res of queryResults) {
    if (res.status === "fulfilled" && Array.isArray(res.value?.items)) {
      for (const item of res.value.items) {
        if (!item || !item.slug || seenSlugs.has(item.slug)) continue;

        // Trích xuất toàn bộ diễn viên (cast) và đạo diễn (director) từ mọi biến thể trường trong database
        const castAndDirectors = extractItemActorsAndDirectors(item);
        const castStr = normalizeForMatch(castAndDirectors.join(" "));
        const itemName = normalizeForMatch(item.name || item.title || "");
        const itemOrig = normalizeForMatch(item.origin_name || item.original_name || "");
        const itemContent = normalizeForMatch(item.content || item.description || "");

        const itemCountry = normalizeForMatch(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Array.isArray(item.country) ? item.country.map((c: any) => c.name || c.slug || "").join(" ") : typeof item.country === "string" ? item.country : ""
        );

        // 1. Kiểm tra trường cast/actors hoặc director (toán tử OR regex / case-insensitive substring)
        const hasExplicitCastMatch = castAndDirectors.length > 0 && normalizedAliases.some((alias) => castStr.includes(alias) || alias.includes(castStr));

        // 2. Khớp theo tiêu đề hoặc tóm tắt phim (Phim tài liệu / phim mang tên nhân vật)
        const isTitleOrDescMatch = normalizedAliases.some(
          (alias) => itemName.includes(alias) || itemOrig.includes(alias) || itemContent.includes(alias)
        );

        // 3. Nếu API search trả về nhưng item không kèm trường actor (rỗng/undefined ở API list), mặc định chấp nhận nếu không vi phạm bộ lọc quốc gia
        const isImplicitSearchMatch = castAndDirectors.length === 0;

        // Strict Country Filter: Nếu tìm kiếm nghệ sĩ Việt Nam, loại trừ phim ngoại quốc nếu không có diễn viên/đạo diễn khớp
        if (country) {
          const normExpectedCountry = normalizeForMatch(country);
          const isVietnamTarget = normExpectedCountry.includes("viet nam");
          const isForeignMovie =
            itemCountry.includes("au my") ||
            itemCountry.includes("my") ||
            itemCountry.includes("anh") ||
            itemCountry.includes("phap");

          if (isVietnamTarget && isForeignMovie && !hasExplicitCastMatch) {
            continue; // Bỏ qua phim ngoại quốc khi tìm nghệ sĩ Việt (ví dụ: Bố Già Vùng Harlem)
          }
        }

        if (hasExplicitCastMatch || isTitleOrDescMatch || isImplicitSearchMatch) {
          seenSlugs.add(item.slug);
          matchedMovies.push({
            ...item,
            isActorFilmography: true,
          });
        }
      }
    }
  }

  // Sắp xếp ưu tiên phim mới nhất
  matchedMovies.sort((a, b) => {
    const yearA = parseInt(String(a.year || "0"), 10) || 0;
    const yearB = parseInt(String(b.year || "0"), 10) || 0;
    return yearB - yearA;
  });

  const finalResults = matchedMovies.slice(0, maxMovies);

  if (finalResults.length > 0) {
    setBoundedCache(ACTOR_FILM_CACHE, cacheKey, {
      items: finalResults,
      expireAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  }

  return finalResults;
}

/**
 * 3. TÌM KIẾM VÀ SO KHỚP CHÍNH XÁC PHIM TỪ KHO PHIM API (CÓ BỘ NHỚ ĐỆM 1 GIỜ)
 * Hỗ trợ tìm cả tên tiếng Việt và tên tiếng Anh / Quốc tế trong ngoặc để tối đa hóa tỷ lệ tìm thấy
 */
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

  const topTitles = titles.slice(0, 10);
  const cacheKey = `${options?.actorName || ""}|${topTitles.join("|")}`;
  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.items.slice(0, maxMovies);
  }

  const seenSlugs = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];

  const allAliases = [options?.actorName, ...(options?.actorAliases || [])]
    .filter((s): s is string => typeof s === "string" && s.trim().length >= 2)
    .map(normalizeForMatch);

  // Thực thi song song tìm kiếm tối đa 8-10 tựa phim với timeout an toàn 1.5s
  const tasks = topTitles.map(async (rawTitle) => {
    try {
      const viTitle = rawTitle.replace(/\([^)]*\)/g, "").trim();
      const matchEng = rawTitle.match(/\(([^)]+)\)/);
      const engTitle = matchEng ? matchEng[1].trim() : "";

      const cleanTargetVi = normalizeForMatch(viTitle);
      const cleanTargetEng = normalizeForMatch(engTitle);

      if (!cleanTargetVi && !cleanTargetEng) return null;

      // Tìm kiếm với timeout 1.5s
      const searchPromise = (async () => {
        let searchRes = cleanTargetVi.length >= 2 ? await movieApi.getMovies({ keyword: viTitle, limit: 6 }) : null;
        let matchedItems = searchRes?.items || [];

        if (matchedItems.length === 0 && engTitle && cleanTargetEng.length >= 2) {
          searchRes = await movieApi.getMovies({ keyword: engTitle, limit: 6 });
          matchedItems = searchRes?.items || [];
        }

        if (matchedItems.length === 0) return null;

        // Tính điểm so khớp chính xác
        let bestItem = null;
        let highestScore = -1;

        for (const item of matchedItems) {
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
              continue; // Bỏ qua ngay lập tức, loại bỏ "Bố Già Vùng Harlem" khi tìm Trấn Thành!
            }
          }

          // 2. STRICT ACTOR/DIRECTOR CHECK: Nếu có danh sách diễn viên cụ thể mà strictActorFilter bật và không có nghệ sĩ
          if (options?.strictActorFilter && itemActorsAndDirectors.length > 0 && !hasActorOrDirector) {
            // Chỉ châm chước nếu tên phim khớp 100% tuyệt đối cả tên tiếng Việt lẫn tên gốc
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
            // Khớp bao hàm: TUYỆT ĐỐI KHÔNG nhận phim nếu tựa phim ngắn (như "Bố Già", "Mai") nhưng kết quả tìm kiếm lại là chuỗi dài ("Bố Già Vùng Harlem")
            const isShortTitle = cleanTargetVi.length < 8 || cleanTargetEng.length < 8;
            if (isShortTitle && !hasActorOrDirector) {
              continue; // Không cho phép match lỏng lẻo đối với tựa phim ngắn
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

          if (score >= 50 && score > highestScore) {
            highestScore = score;
            bestItem = item;
          }
        }

        return bestItem;
      })();

      return await Promise.race([
        searchPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1600)),
      ]);
    } catch (err) {
      console.warn(`[aiActorService] Error searching title "${rawTitle}":`, err);
      return null;
    }
  });

  const resolved = await Promise.allSettled(tasks);

  for (const outcome of resolved) {
    if (outcome.status === "fulfilled" && outcome.value) {
      const item = outcome.value;
      if (item && item.slug && !seenSlugs.has(item.slug)) {
        seenSlugs.add(item.slug);
        results.push(item);
        if (results.length >= maxMovies) break;
      }
    }
  }

  if (results.length > 0) {
    setBoundedCache(ACTOR_FILM_CACHE, cacheKey, {
      items: results,
      expireAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  }

  return results;
}
