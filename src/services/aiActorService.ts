import { movieApi } from "@/services/movieApi";

export interface ActorFilmography {
  name: string;
  aliases: string[];
  country: string;
  titles: string[];
}

// 1. KHO TRI THỨC DIỄN VIÊN ĐIỆN ẢNH TUYỂN CHỌN (0 TOKEN & 0MS PHẢN HỒI)
export const KNOWN_ACTORS_FILMOGRAPHY: ActorFilmography[] = [
  {
    name: "Thành Long",
    aliases: ["thanh long", "jackie chan", "thành long"],
    country: "Hồng Kông 🇭🇰",
    titles: [
      "Kế Hoạch Baby",
      "Túy Quyền",
      "Câu Chuyện Cảnh Sát",
      "Giờ Cao Điểm",
      "Thần Thoại",
      "12 Con Giáp",
      "Đại Náo Phố Bronx",
      "Hiệp Sĩ Thượng Hải",
      "Kẻ Ngoại Tộc",
      "Thiếu Lâm Tự",
      "Vua Kung Fu",
    ],
  },
  {
    name: "Châu Tinh Trì",
    aliases: ["chau tinh tri", "stephen chow", "châu tinh trì", "tinh gia"],
    country: "Hồng Kông 🇭🇰",
    titles: [
      "Tuyệt Đỉnh Kungfu",
      "Đội Bóng Thiếu Lâm",
      "Đại Thoại Tây Du",
      "Vua Hài Kịch",
      "Quan Xẩm Lốc Cốc",
      "Đường Bá Hổ Điểm Thu Hương",
      "Tân Tinh Võ Môn",
      "Thánh Bài",
      "Chuyên Gia Bắt Ma",
      "Mỹ Nhân Ngư",
      "Trường Học Uy Long",
    ],
  },
  {
    name: "Chân Tử Đan",
    aliases: ["chan tu dan", "donnie yen", "chân tử đan"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Diệp Vấn",
      "Diệp Vấn 2",
      "Diệp Vấn 3",
      "Diệp Vấn 4",
      "Sát Phá Lang",
      "Đạo Hỏa Tuyến",
      "Trùm Hương Cảng",
      "Long Hổ Môn",
      "Đại Sư Huynh",
      "Cẩm Y Vệ",
    ],
  },
  {
    name: "Lý Liên Kiệt",
    aliases: ["ly lien kiet", "jet li", "lý liên kiệt"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Hoàng Phi Hồng",
      "Tinh Võ Anh Hùng",
      "Vua Kung Fu",
      "Anh Hùng",
      "Biệt Đội Đánh Thuê",
      "Long Môn Phi Giáp",
      "Hoắc Nguyên Giáp",
    ],
  },
  {
    name: "Ngô Kinh",
    aliases: ["ngo kinh", "wu jing", "ngô kinh"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Chiến Lang",
      "Chiến Lang 2",
      "Lưu Lạc Địa Cầu",
      "Lưu Lạc Địa Cầu 2",
      "Sát Phá Lang",
      "Hồ Trường Tân",
      "Kim Cương Xuyên",
    ],
  },
  {
    name: "Lưu Diệc Phi",
    aliases: ["luu diec phi", "crystal liu", "liu yifei", "lưu diệc phi"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Thần Điêu Đại Hiệp",
      "Thiên Long Bát Bộ",
      "Mộng Hoa Lục",
      "Tam Sinh Tam Thế Thập Lý Đào Hoa",
      "Hoa Mộc Lan",
      "Đi Đến Nơi Có Gió",
      "Câu Chuyện Hoa Hồng",
    ],
  },
  {
    name: "Dương Mịch",
    aliases: ["duong mich", "yang mi", "dương mịch"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Tam Sinh Tam Thế Thập Lý Đào Hoa",
      "Cung Tỏa Tâm Ngọc",
      "Hộc Châu Phu Nhân",
      "Phù Dao Hoàng Hậu",
      "Bạo Phong Nhãn",
      "Cổ Kiếm Kỳ Đàm",
    ],
  },
  {
    name: "Triệu Lệ Dĩnh",
    aliases: ["trieu le dinh", "zhao liying", "triệu lệ dĩnh"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Sở Kiều Truyện",
      "Minh Lan Truyện",
      "Hoa Thiên Cốt",
      "Dữ Phượng Hành",
      "Gió Thổi Bán Hạ",
      "Hạnh Phúc Đến Vạn Gia",
    ],
  },
  {
    name: "Tiêu Chiến",
    aliases: ["tieu chien", "xiao zhan", "tiêu chiến"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Trần Tình Lệnh",
      "Ngọc Cốt Dao",
      "Đấu La Đại Lục",
      "Vùng Biển Trong Mơ",
      "Mặt Trời Rực Rỡ Bên Tôi",
      "Lang Điện Hạ",
    ],
  },
  {
    name: "Vương Nhất Bác",
    aliases: ["vuong nhat bac", "wang yibo", "vương nhất bác"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Trần Tình Lệnh",
      "Hữu Phỉ",
      "Phong Khởi Lạc Dương",
      "Vô Danh",
      "Nhiệt Liệt",
      "Truy Phong Giả",
    ],
  },
  {
    name: "Song Joong Ki",
    aliases: ["song joong ki", "song joong-ki", "song joongki"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Hậu Duệ Mặt Trời",
      "Vincenzo",
      "Cậu Út Nhà Tài Phiệt",
      "Gã Khờ",
      "Con Tàu Chiến Thắng",
      "Cậu Bé Người Sói",
      "Đảo Địa Ngục",
    ],
  },
  {
    name: "Lee Min Ho",
    aliases: ["lee min ho", "lee min-ho", "leeminho"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Vườn Sao Băng",
      "Thợ Săn Thành Phố",
      "Người Thừa Kế",
      "Huyền Thoại Biển Xanh",
      "Quân Vương Bất Diệt",
      "Gangnam Blues",
    ],
  },
  {
    name: "Hyun Bin",
    aliases: ["hyun bin", "hyunbin"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Hạ Cánh Nơi Anh",
      "Khu Vườn Bí Mật",
      "Đàm Phán Sinh Tử",
      "Cộng Sự Bất Đắc Dĩ",
      "Hồi Ức Alhambra",
      "Dạ Quỷ",
    ],
  },
  {
    name: "Park Seo Joon",
    aliases: ["park seo joon", "park seo-joon", "park seojoon"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Tầng Lớp Itaewon",
      "Thư Ký Kim Sao Thế",
      "Thanh Xuân Vật Vã",
      "Cảnh Sát Tập Sự",
      "Bàn Tay Diệt Quỷ",
      "Ký Sinh Trùng",
    ],
  },
  {
    name: "Ma Dong Seok",
    aliases: ["ma dong seok", "ma dong-seok", "don lee"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Chuyến Tàu Sinh Tử",
      "Trùm Cớm Và Ác Quỷ",
      "Vây Hãm",
      "Thành Phố Tội Ác",
      "Thợ Săn Hoang Mạc",
      "Trùm Cớm Vô Gian Đạo",
    ],
  },
  {
    name: "Kim Soo Hyun",
    aliases: ["kim soo hyun", "kim soo-hyun", "kim soohyun"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Nữ Hoàng Nước Mắt",
      "Vì Sao Đưa Anh Tới",
      "Điên Thì Có Sao",
      "Mặt Trăng Ôm Mặt Trời",
      "Hậu Trường Giải Trí",
      "Ẩn Thân",
    ],
  },
  {
    name: "Tom Cruise",
    aliases: ["tom cruise"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Nhiệm Vụ Bất Khả Thi",
      "Phi Công Siêu Đẳng Maverick",
      "Cuộc Chiến Luân Hồi",
      "Kẻ Ngoại Tộc",
      "Hiệp Sĩ Áo Đen",
      "Chiến Tranh Giữa Các Thế Giới",
    ],
  },
  {
    name: "Leonardo DiCaprio",
    aliases: ["leonardo dicaprio", "dicaprio", "leo dicaprio"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Titanic",
      "Kẻ Trộm Giấc Mơ",
      "Đảo Kinh Hoàng",
      "Sói Già Phố Wall",
      "Người Về Từ Cõi Chết",
      "Bắt Tôi Nếu Có Thể",
    ],
  },
  {
    name: "Keanu Reeves",
    aliases: ["keanu reeves", "john wick"],
    country: "Hollywood 🇺🇸",
    titles: [
      "John Wick",
      "John Wick 2",
      "John Wick 3",
      "John Wick 4",
      "Ma Trận",
      "Địa Ngục Constantine",
      "Tốc Độ",
    ],
  },
  {
    name: "Robert Downey Jr",
    aliases: ["robert downey", "robert downey jr", "iron man"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Người Sắt",
      "Người Sắt 2",
      "Người Sắt 3",
      "Biệt Đội Siêu Anh Hùng",
      "Sherlock Holmes",
      "Oppenheimer",
    ],
  },
  {
    name: "Dwayne Johnson",
    aliases: ["dwayne johnson", "the rock"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Fast & Furious 7",
      "Fast & Furious 8",
      "Jumanji: Trò Chơi Kỳ Ảo",
      "Tòa Tháp Chọc Trời",
      "Siêu Thú Cuồng Nộ",
      "Black Adam",
    ],
  },
  {
    name: "Trấn Thành",
    aliases: ["tran thanh", "trấn thành"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Bố Già",
      "Nhà Bà Nữ",
      "Mai",
      "Cua Lại Vợ Bầu",
      "Trạng Quỳnh",
    ],
  },
  {
    name: "Thái Hòa",
    aliases: ["thai hoa", "thái hòa"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Để Mai Tính",
      "Tèo Em",
      "Tiệc Trăng Máu",
      "Chuyện Xóm Tui",
      "Quả Tim Máu",
      "Cây Táo Nở Hoa",
    ],
  },
];

// Bộ nhớ đệm tra cứu diễn viên bằng AI (TTL: 7 ngày)
const ACTOR_AI_CACHE = new Map<string, { titles: string[]; actorName: string; expireAt: number }>();
const CACHE_7_DAYS = 7 * 24 * 60 * 60 * 1000;

export function cleanString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFC")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>\\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * 2. NHẬN DIỆN DIỄN VIÊN & LẤY DANH SÁCH PHIM TIÊU BIỂU
 * Kiểm tra local dictionary trước (0 token).
 * Nếu không có trong từ điển, gọi Google Gemini để chuyển đổi tên diễn viên thành danh sách phim!
 */
export async function resolveActorMovies(keyword: string): Promise<{
  actorName: string;
  country?: string;
  titles: string[];
  isActor: boolean;
  source: "local" | "gemini" | "none";
}> {
  const clean = cleanString(keyword);
  const cleanNoAccent = removeAccents(clean);

  // 2.1 Kiểm tra Local Dictionary (0 Token, 0ms)
  for (const item of KNOWN_ACTORS_FILMOGRAPHY) {
    const isMatch = item.aliases.some((alias) => {
      const aClean = cleanString(alias);
      const aNoAccent = removeAccents(aClean);
      return (
        clean === aClean ||
        cleanNoAccent === aNoAccent ||
        clean.includes(aClean) ||
        cleanNoAccent.includes(aNoAccent) ||
        (clean.length >= 4 && aClean.includes(clean)) ||
        (cleanNoAccent.length >= 4 && aNoAccent.includes(cleanNoAccent))
      );
    });
    if (isMatch) {
      return {
        actorName: item.name,
        country: item.country,
        titles: item.titles,
        isActor: true,
        source: "local",
      };
    }
  }

  // 2.2 Kiểm tra Cache của AI
  const cached = ACTOR_AI_CACHE.get(clean);
  if (cached && cached.expireAt > Date.now()) {
    return {
      actorName: cached.actorName,
      titles: cached.titles,
      isActor: true,
      source: "gemini",
    };
  }

  // 2.3 Nếu keyword có dấu hiệu tìm diễn viên hoặc là từ 2-4 chữ (tên riêng), hỏi Gemini
  const words = clean.split(/\s+/);
  const looksLikeActor =
    clean.includes("diễn viên") ||
    clean.includes("đóng") ||
    clean.includes("phim của") ||
    (words.length >= 2 && words.length <= 4 && !clean.includes("tập") && !clean.includes("phim lẻ"));

  if (!looksLikeActor) {
    return {
      actorName: "",
      titles: [],
      isActor: false,
      source: "none",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      actorName: "",
      titles: [],
      isActor: false,
      source: "none",
    };
  }

  try {
    const promptText = `Người dùng đang tìm phim liên quan đến từ khóa: "${keyword}".
Nếu đây là tên một diễn viên điện ảnh (hoặc người nổi tiếng tham gia đóng phim), hãy trả về:
{
  "isActor": true,
  "actorName": "Tên chuẩn của diễn viên",
  "titles": ["Tên phim 1 (tiếng Việt)", "Tên phim 2 (tiếng Việt)", "Tên phim 3", "Tên phim 4", "Tên phim 5", "Tên phim 6", "Tên phim 7", "Tên phim 8"]
}
Nếu đây KHÔNG PHẢI là tên diễn viên (mà là tên phim, câu hỏi thông thường), trả về {"isActor": false}.
Trả về DUY NHẤT một chuỗi JSON hợp lệ.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
            maxOutputTokens: 600, // Token cực nhỏ chỉ ~100 tokens
          },
        }),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      const parsed = JSON.parse(text);

      if (parsed.isActor && Array.isArray(parsed.titles) && parsed.titles.length > 0) {
        ACTOR_AI_CACHE.set(clean, {
          actorName: parsed.actorName || keyword,
          titles: parsed.titles,
          expireAt: Date.now() + CACHE_7_DAYS,
        });

        return {
          actorName: parsed.actorName || keyword,
          titles: parsed.titles,
          isActor: true,
          source: "gemini",
        };
      }
    }
  } catch (err) {
    console.warn("AI Actor lookup error:", err);
  }

  return {
    actorName: "",
    titles: [],
    isActor: false,
    source: "none",
  };
}

// In-memory cache cho danh sách phim diễn viên (TTL: 1 giờ) giúp tải trang 0ms
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTOR_FILM_CACHE = new Map<string, { items: any[]; expireAt: number }>();
const CACHE_1_HOUR = 60 * 60 * 1000;

/**
 * 3. TÌM KIẾM PHIM THEO DANH SÁCH TỰA ĐỀ TỪ KHO PHIM API (CÓ BỘ NHỚ ĐỆM 1 GIỜ)
 * Chạy song song và loại trừ trùng lặp theo slug
 */
export async function fetchMoviesByTitles(
  titles: string[],
  maxMovies = 18
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const cacheKey = titles.slice(0, 10).join("|");
  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.items.slice(0, maxMovies);
  }

  const seenSlugs = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];

  // Giảm số lượng truy vấn xuống 8 tựa đề chính xác nhất để tối ưu tốc độ phản hồi và tải trang tức thì
  const tasks = titles.slice(0, 8).map(async (t) => {
    try {
      const cleanTitle = t.replace(/\([^)]*\)/g, "").trim();
      const res = await movieApi.getMovies({
        keyword: cleanTitle,
        page: 1,
        limit: 2,
      });
      return res?.items || [];
    } catch {
      return [];
    }
  });

  const batches = await Promise.all(tasks);
  for (const list of batches) {
    for (const m of list) {
      if (m?.slug && !seenSlugs.has(m.slug)) {
        seenSlugs.add(m.slug);
        results.push(m);
      }
      if (results.length >= maxMovies) break;
    }
    if (results.length >= maxMovies) break;
  }

  if (results.length > 0) {
    ACTOR_FILM_CACHE.set(cacheKey, {
      items: results,
      expireAt: Date.now() + CACHE_1_HOUR,
    });
  }

  return results;
}
