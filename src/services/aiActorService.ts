import { movieApi } from "@/services/movieApi";
import { GoogleGenAI } from "@google/genai";

export interface ActorFilmography {
  name: string;
  aliases: string[];
  country: string;
  titles: string[];
}

// =========================================================================
// 1. KHO TRI THỨC DIỄN VIÊN & ĐẠO DIỄN TUYỂN CHỌN SIÊU TỐC (0 TOKEN & 0MS)
// =========================================================================
export const KNOWN_ACTORS_FILMOGRAPHY: ActorFilmography[] = [
  // --- HỒNG KÔNG & TRUNG QUỐC ---
  {
    name: "Thành Long",
    aliases: ["thanh long", "jackie chan", "thành long", "thanhlong"],
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
    aliases: ["chau tinh tri", "stephen chow", "châu tinh trì", "tinh gia", "chautinhtri"],
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
    aliases: ["chan tu dan", "donnie yen", "chân tử đan", "chantudan"],
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
    aliases: ["ly lien kiet", "jet li", "lý liên kiệt", "lylienkid"],
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
    aliases: ["ngo kinh", "wu jing", "ngô kinh", "ngokinh"],
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
    name: "Địch Lệ Nhiệt Ba",
    aliases: ["dich le nhiet ba", "dilraba", "địch lệ nhiệt ba", "dilraba dilmurat"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Em Là Niềm Kiêu Hãnh Của Anh",
      "Ngự Giao Ký",
      "Tam Sinh Tam Thế Chẩm Thượng Thư",
      "Trường Ca Hành",
      "An Lạc Truyện",
    ],
  },
  {
    name: "Dương Dương",
    aliases: ["duong duong", "yang yang", "dương dương"],
    country: "Trung Quốc 🇨🇳",
    titles: [
      "Yêu Em Từ Cái Nhìn Đầu Tiên",
      "Em Là Niềm Kiêu Hãnh Của Anh",
      "Toàn Chức Cao Thủ",
      "Thả Thí Thiên Hạ",
      "Khói Lửa Nhân Gian Của Tôi",
    ],
  },

  // --- VIỆT NAM ---
  {
    name: "Trấn Thành",
    aliases: ["tran thanh", "trấn thành", "tranthanh", "xìn"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Mai",
      "Nhà Bà Nữ",
      "Bố Già",
      "Cua Lại Vợ Bầu",
      "Trạng Quỳnh",
      "Đất Rừng Phương Nam",
      "Bệnh Viện Ma",
    ],
  },
  {
    name: "Thái Hòa",
    aliases: ["thai hoa", "thái hòa", "ông hoàng phòng vé"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Để Mai Tính",
      "Tèo Em",
      "Quả Tim Máu",
      "Tiệc Trăng Máu",
      "Chàng Vợ Của Em",
      "Cây Táo Nở Hoa",
      "Con Nhót Mót Chồng",
      "Địa Đạo",
    ],
  },
  {
    name: "Ninh Dương Lan Ngọc",
    aliases: ["ninh duong lan ngoc", "lan ngoc", "ninh dương lan ngọc"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Cua Lại Vợ Bầu",
      "Gái Già Lắm Chiêu 2",
      "Gái Già Lắm Chiêu 3",
      "Cô Ba Sài Gòn",
      "Tấm Cám: Chuyện Chưa Kể",
      "Cô Gái Từ Quá Khứ",
    ],
  },
  {
    name: "Thu Trang",
    aliases: ["thu trang", "tiến luật", "hoa hậu làng hài"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Chị Mười Ba",
      "Tiệc Trăng Máu",
      "Nghề Siêu Dễ",
      "Đôi Mắt Âm Dương",
      "Chuyện Xóm Tui",
      "Con Nhót Mót Chồng",
    ],
  },
  {
    name: "Kiều Minh Tuấn",
    aliases: ["kieu minh tuan", "kiều minh tuấn"],
    country: "Việt Nam 🇻🇳",
    titles: [
      "Em Chưa 18",
      "Tiệc Trăng Máu",
      "Chìa Khóa Trăm Tỷ",
      "Nghề Siêu Dễ",
      "Kẻ Ẩn Danh",
      "Cô Gái Đến Từ Hôm Qua",
    ],
  },

  // --- HÀN QUỐC ---
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
    name: "Son Ye Jin",
    aliases: ["son ye jin", "son ye-jin", "sonyejin"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Hạ Cánh Nơi Anh",
      "Chị Đẹp Mua Cơm Ngon Cho Tôi",
      "Cổ Điển",
      "Và Em Sẽ Đến",
      "Đàm Phán Sinh Tử",
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
      "Sinh Vật Gyeongseong",
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
    name: "Song Hye Kyo",
    aliases: ["song hye kyo", "song hye-kyo", "songhyekyo"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Vinh Quang Trong Thù Hận",
      "Hậu Duệ Mặt Trời",
      "Gió Mùa Đông Năm Ấy",
      "Ngôi Nhà Hạnh Phúc",
      "Trái Tim Mùa Thu",
    ],
  },
  {
    name: "IU (Lee Ji Eun)",
    aliases: ["iu", "lee ji eun", "lee ji-eun"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Khách Sạn Ánh Trăng",
      "Người Tình Ánh Trăng",
      "Ông Chú Của Tôi",
      "Người Môi Giới",
      "Dream (Ước Mơ)",
    ],
  },

  // --- HOLLYWOOD & QUỐC TẾ ---
  {
    name: "Tom Cruise",
    aliases: ["tom cruise", "tomcruise"],
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
    name: "Robert Downey Jr",
    aliases: ["robert downey jr", "rdj", "iron man", "tony stark"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Người Sắt",
      "Người Sắt 2",
      "Người Sắt 3",
      "Avengers: Hồi Kết",
      "Avengers: Cuộc Chiến Vô Cực",
      "Sherlock Holmes",
      "Oppenheimer",
    ],
  },
  {
    name: "Leonardo DiCaprio",
    aliases: ["leonardo dicaprio", "leo dicaprio"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Titanic",
      "Kẻ Đánh Cắp Giấc Mơ",
      "Sói Già Phố Wall",
      "Người Về Từ Cõi Chết",
      "Đảo Kinh Hoàng",
      "Chuyện Ngày Xưa Ở Hollywood",
    ],
  },
  {
    name: "Keanu Reeves",
    aliases: ["keanu reeves", "john wick", "neo"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Sát Thủ John Wick",
      "John Wick 2",
      "John Wick 3",
      "Sát Thủ John Wick 4",
      "Ma Trận",
      "Constantine",
      "Kẻ Tốc Độ",
    ],
  },
  {
    name: "Cillian Murphy",
    aliases: ["cillian murphy", "tommy shelby", "oppenheimer"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Oppenheimer",
      "Bóng Ma Anh Quốc (Peaky Blinders)",
      "Kẻ Đánh Cắp Giấc Mơ",
      "Cuộc Di Tản Dunkirk",
      "Kỵ Sĩ Bóng Đêm",
    ],
  },
  {
    name: "Brad Pitt",
    aliases: ["brad pitt", "bradpitt"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Sát Thủ Đối Đầu",
      "Chiến Binh Số Một",
      "Ông Bà Smith",
      "Chuyện Ngày Xưa Ở Hollywood",
      "Cuộc Chiến Sinh Tử",
      "Câu Lạc Bộ Đấm Bốc",
    ],
  },
  {
    name: "Scarlett Johansson",
    aliases: ["scarlett johansson", "black widow", "natasha romanoff"],
    country: "Hollywood 🇺🇸",
    titles: [
      "Góa Phụ Đen",
      "Avengers: Hồi Kết",
      "Avengers: Cuộc Chiến Vô Cực",
      "Vỏ Bọc Ma Ma",
      "Lucy",
      "Câu Chuyện Hôn Nhân",
    ],
  },

  // --- ĐẠO DIỄN HUYỀN THOẠI ---
  {
    name: "Christopher Nolan",
    aliases: ["christopher nolan", "nolan"],
    country: "Đạo Diễn Huyền Thoại 🎬",
    titles: [
      "Oppenheimer",
      "Hố Tử Thần (Interstellar)",
      "Kẻ Đánh Cắp Giấc Mơ (Inception)",
      "Kỵ Sĩ Bóng Đêm (The Dark Knight)",
      "Kỵ Sĩ Bóng Đêm Trỗi Dậy",
      "Tenet",
      "Cuộc Di Tản Dunkirk",
      "Mê Cung Ký Ức (Memento)",
    ],
  },
  {
    name: "James Cameron",
    aliases: ["james cameron"],
    country: "Đạo Diễn Huyền Thoại 🎬",
    titles: [
      "Avatar: Dòng Chảy Của Nước",
      "Avatar",
      "Titanic",
      "Kẻ Hủy Diệt 2",
      "Quái Vật Không Gian (Aliens)",
    ],
  },
  {
    name: "Denis Villeneuve",
    aliases: ["denis villeneuve"],
    country: "Đạo Diễn Huyền Thoại 🎬",
    titles: [
      "Dune: Hành Tinh Cát",
      "Dune: Hành Tinh Cát (Phần 2)",
      "Tử Địa Blade Runner 2049",
      "Cuộc Đổ Bộ Bí Ẩn (Arrival)",
      "Ranh Giới (Sicario)",
    ],
  },
  {
    name: "Bong Joon Ho",
    aliases: ["bong joon ho", "bong joon-ho"],
    country: "Hàn Quốc 🇰🇷",
    titles: [
      "Ký Sinh Trùng (Parasite)",
      "Chuyến Tàu Băng Giá (Snowpiercer)",
      "Quái Vật Sông Hàn (The Host)",
      "Hồi Ức Kẻ Sát Nhân",
    ],
  },
];

// Cache bộ nhớ nhanh cho các câu hỏi AI (TTL: 7 ngày)
const ACTOR_AI_CACHE = new Map<string, { actorName: string; titles: string[]; expireAt: number }>();
const CACHE_7_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * Chuẩn hoá chuỗi để so khớp không dấu
 */
function normalizeForMatch(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 2. PHÂN GIẢI NHANH TÊN DIỄN VIÊN / ĐẠO DIỄN (Ưu tiên Dictionary 0ms, fallback Gemini 1.2s)
 */
export async function resolveActorMovies(keyword: string): Promise<{
  actorName: string;
  country?: string;
  titles: string[];
  isActor: boolean;
  source: "local" | "gemini" | "none";
}> {
  if (!keyword || keyword.trim().length < 2) {
    return { actorName: "", titles: [], isActor: false, source: "none" };
  }

  const clean = keyword.trim().toLowerCase();
  const normalizedKeyword = normalizeForMatch(clean);

  // 2.1 Tra cứu tức thì trong Kho Tri Thức Local (0ms)
  for (const item of KNOWN_ACTORS_FILMOGRAPHY) {
    const isMatch = item.aliases.some((alias) => {
      const normAlias = normalizeForMatch(alias);
      return (
        normalizedKeyword === normAlias ||
        normalizedKeyword.includes(normAlias) ||
        normAlias.includes(normalizedKeyword)
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

  // 2.3 Nhận diện nếu từ khóa có dấu hiệu tìm diễn viên hoặc là tên riêng
  const words = clean.split(/\s+/);
  const looksLikeActor =
    clean.includes("diễn viên") ||
    clean.includes("đóng") ||
    clean.includes("phim của") ||
    clean.includes("đạo diễn") ||
    (words.length >= 2 && words.length <= 4 && !clean.includes("tập") && !clean.includes("phim lẻ"));

  if (!looksLikeActor) {
    return { actorName: "", titles: [], isActor: false, source: "none" };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { actorName: "", titles: [], isActor: false, source: "none" };
  }

  try {
    const promptText = `Người dùng đang tìm phim liên quan đến từ khóa: "${keyword}".
Nếu đây là tên một diễn viên/đạo diễn điện ảnh, hãy trả về:
{
  "isActor": true,
  "actorName": "Tên chuẩn",
  "titles": ["Phim 1 (tiếng Việt)", "Phim 2", "Phim 3", "Phim 4", "Phim 5", "Phim 6"]
}
Nếu KHÔNG PHẢI tên diễn viên/đạo diễn, trả về {"isActor": false}.
Chỉ trả về JSON thuần túy.`;

    const ai = new GoogleGenAI({ apiKey, vertexai: false });
    const ACTOR_MODELS = ["gemini-3.5-flash", "gemini-3.6-flash"];
    let rawText: string | null = null;

    for (const model of ACTOR_MODELS) {
      try {
        const is35 = model.includes("3.5");
        const result = await Promise.race([
          ai.models.generateContent({
            model,
            contents: promptText,
            config: {
              responseMimeType: "application/json",
              temperature: 0.2,
              maxOutputTokens: 500,
              ...(is35 ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("AI timeout")), 2500)
          ),
        ]);
        const text = result.text?.trim();
        if (text) {
          rawText = text;
          break;
        }
      } catch {
        // Fallback tức thì nếu timeout hoặc quá tải
      }
    }

    if (rawText) {
      const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
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
  maxMovies = 16
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const cacheKey = titles.slice(0, 8).join("|");
  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.items.slice(0, maxMovies);
  }

  const seenSlugs = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];

  // Thực thi song song tối đa 6 truy vấn chính xác nhất để phản hồi trong chớp mắt
  const tasks = titles.slice(0, 6).map(async (t) => {
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
