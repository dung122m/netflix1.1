import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { movieApi } from "@/services/movieApi";

export const maxDuration = 15;

// In-memory cache cho các kết hợp roulette
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ROULETTE_CACHE = new Map<string, { data: any; cachedAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 tiếng

// Bộ phim dự phòng offline phong phú và kinh điển theo từng mood (0 token & phản hồi 0ms)
const CURATED_OFFLINE_PICKS: Record<
  string,
  { title: string; originalTitle: string; punchline: string; badges: string[]; country?: string }[]
> = {
  "xa-stress": [
    {
      title: "Tuyệt Đỉnh Kungfu",
      originalTitle: "Kung Fu Hustle",
      punchline: "Cười ra nước mắt với tuyệt kỹ võ thuật và khiếu hài hước đỉnh cao của Châu Tinh Trì!",
      badges: ["Hài Hước", "Võ Thuật", "Kinh Điển"],
      country: "Trung Quốc",
    },
    {
      title: "Kế Hoạch Baby",
      originalTitle: "Rob-B-Hood",
      punchline: "Bộ đôi trộm vặt Thành Long & Cổ Thiên Lạc vướng vào phi vụ trông em bé dở khóc dở cười.",
      badges: ["Gia Đình", "Hành Động", "Ấm Áp"],
      country: "Hồng Kông",
    },
    {
      title: "Nghề Siêu Khó",
      originalTitle: "Extreme Job",
      punchline: "Đội cảnh sát ngầm bán gà rán siêu đắt hàng, tấu hài cực mạnh và hành động cực đã!",
      badges: ["Hài Hước", "Hàn Quốc", "Đỉnh Cao"],
      country: "Hàn Quốc",
    },
    {
      title: "Chuyến Bay Tình Yêu",
      originalTitle: "Airplane!",
      punchline: "Liều thuốc chữa lành mọi mệt mỏi với những màn tấu hài không lối thoát.",
      badges: ["Hài Nhảm", "Xả Stress", "Kinh Điển"],
      country: "Âu Mỹ",
    },
    {
      title: "Chàng Nữ Phi Công",
      originalTitle: "Pilot",
      punchline: "Màn giả gái làm cơ trưởng máy bay cười bể bụng và tràn ngập năng lượng tích cực.",
      badges: ["Hài Hước", "Hàn Quốc", "Mới Lạ"],
      country: "Hàn Quốc",
    },
    {
      title: "Bố Già",
      originalTitle: "Dad, I'm Sorry",
      punchline: "Câu chuyện gia đình xóm lao động vừa cười ngả nghiêng vừa xúc động rơi nước mắt.",
      badges: ["Gia Đình", "Việt Nam", "Cảm Động"],
      country: "Việt Nam",
    },
  ],
  "mau-lua": [
    {
      title: "Sát Thủ John Wick",
      originalTitle: "John Wick",
      punchline: "Những pha cận chiến võ thuật súng đỉnh cao và mãn nhãn nghẹt thở từ phút đầu tới phút cuối.",
      badges: ["Hành Động", "Xạ Thủ", "Mãn Nhãn"],
      country: "Âu Mỹ",
    },
    {
      title: "Max Điên Cuồng: Con Đường Tử Thần",
      originalTitle: "Mad Max: Fury Road",
      punchline: "Bữa tiệc tốc độ, khói lửa và hoang dã gầm rú làm bùng nổ mọi giác quan của bạn!",
      badges: ["Tốc Độ", "Hậu Tận Thế", "Cháy Bỏng"],
      country: "Âu Mỹ",
    },
    {
      title: "Diệp Vấn",
      originalTitle: "Ip Man",
      punchline: "Vịnh Xuân Quyền dũng mãnh, tinh thần thượng võ kiên cường đốn tim người hâm mộ.",
      badges: ["Võ Thuật", "Hành Động", "Chân Tử Đan"],
      country: "Trung Quốc",
    },
    {
      title: "Trùm Băng Đảng Và Cảnh Sát",
      originalTitle: "The Gangster, The Cop, The Devil",
      punchline: "Ma Dong Seok tung cú đấm ngàn cân cùng liên minh bất đắc dĩ săn lùng kẻ thủ ác.",
      badges: ["Hành Động", "Đấm Đá", "Ma Dong Seok"],
      country: "Hàn Quốc",
    },
    {
      title: "Nhiệm Vụ Bất Khả Thi: Nghiệp Báo",
      originalTitle: "Mission: Impossible - Dead Reckoning",
      punchline: "Tom Cruise bất chấp nguy hiểm với những pha mạo hiểm người thật việc thật đỉnh nóc kịch trần.",
      badges: ["Điệp Viên", "Mãn Nhãn", "Bom Tấn"],
      country: "Âu Mỹ",
    },
    {
      title: "Hai Phượng",
      originalTitle: "Furie",
      punchline: "Ngô Thanh Vân đại náo giới giang hồ để giải cứu con gái với những pha hành động nghẹt thở.",
      badges: ["Hành Động", "Việt Nam", "Võ Thuật"],
      country: "Việt Nam",
    },
  ],
  "hack-nao": [
    {
      title: "Kẻ Đánh Cắp Giấc Mơ",
      originalTitle: "Inception",
      punchline: "Lạc vào mê cung đa tầng giấc mơ đỉnh cao khiến bạn phải tua lại từng khung hình!",
      badges: ["Hack Não", "Kịch Tính", "Siêu Phẩm"],
      country: "Âu Mỹ",
    },
    {
      title: "Đảo Kinh Hoàng",
      originalTitle: "Shutter Island",
      punchline: "Cú 'quay xe' chấn động điện ảnh khiến bạn nghi ngờ toàn bộ những gì mình vừa nhìn thấy.",
      badges: ["Tâm Lý", "Trinh Thám", "Bất Ngờ"],
      country: "Âu Mỹ",
    },
    {
      title: "Hố Đen Tử Thần",
      originalTitle: "Interstellar",
      punchline: "Hành trình xuyên không gian cảm động kết hợp khoa học viễn tưởng vĩ đại.",
      badges: ["Vũ Trụ", "Tình Phụ Tử", "Kiệt Tác"],
      country: "Âu Mỹ",
    },
    {
      title: "Ký Sinh Trùng",
      originalTitle: "Parasite",
      punchline: "Kiệt tác đoạt 4 giải Oscar vạch trần hố sâu giai cấp với những nút thắt nghẹt thở.",
      badges: ["Tâm Lý", "Kịch Tính", "Oscar"],
      country: "Hàn Quốc",
    },
    {
      title: "Kẻ Nhớ Ngược",
      originalTitle: "Memento",
      punchline: "Cốt truyện đảo ngược dòng thời gian cực kỳ độc lạ và đầy thử thách trí tuệ.",
      badges: ["Xoắn Não", "Nghệ Thuật", "Kinh Điển"],
      country: "Âu Mỹ",
    },
    {
      title: "Cô Gái Mất Tích",
      originalTitle: "Gone Girl",
      punchline: "Màn đấu trí hôn nhân lạnh sống lưng cùng những cú plot-twist không thể lường trước.",
      badges: ["Trinh Thám", "Hồi Hộp", "Tâm Lý"],
      country: "Âu Mỹ",
    },
  ],
  "ngot-ngao": [
    {
      title: "Hạ Cánh Nơi Anh",
      originalTitle: "Crash Landing on You",
      punchline: "Chuyện tình vượt biên giới đẹp như mơ đốn tim hàng triệu khán giả khắp thế giới.",
      badges: ["Lãng Mạn", "Hàn Quốc", "Cực Ngọt"],
      country: "Hàn Quốc",
    },
    {
      title: "Yêu Lại Từ Đầu",
      originalTitle: "About Time",
      punchline: "Một chuyện tình du hành thời gian nhẹ nhàng, ấm áp và đong đầy triết lý nhân sinh.",
      badges: ["Xúc Động", "Gia Đình", "Chữa Lành"],
      country: "Âu Mỹ",
    },
    {
      title: "Vụng Trộm Không Thể Giấu",
      originalTitle: "Hidden Love",
      punchline: "Mối tình thanh xuân ngọt ngào ngập tràn mật đường giữa Tang Trĩ và Đoàn Gia Hứa.",
      badges: ["Thanh Xuân", "Ngọt Ngào", "Trung Quốc"],
      country: "Trung Quốc",
    },
    {
      title: "La La Land: Những Kẻ Khờ Mộng Mơ",
      originalTitle: "La La Land",
      punchline: "Khúc ca tình yêu và ước mơ giữa lòng Los Angeles đẹp lung linh và day dứt khôn nguôi.",
      badges: ["Âm Nhạc", "Lãng Mạn", "Kinh Điển"],
      country: "Âu Mỹ",
    },
    {
      title: "Hôn Lễ Của Em",
      originalTitle: "On Your Wedding Day",
      punchline: "Thanh xuân có thể lỡ hẹn, nhưng tình yêu đẹp đẽ nhất sẽ luôn ở lại trong tim.",
      badges: ["Thanh Xuân", "Hàn Quốc", "Lắng Đọng"],
      country: "Hàn Quốc",
    },
    {
      title: "Mắt Biếc",
      originalTitle: "Dreamy Eyes",
      punchline: "Bản tình ca đượm buồn của làng Đo Đo cùng ánh mắt biếc ám ảnh cả một đời người.",
      badges: ["Việt Nam", "Hoài Niệm", "Chữa Lành"],
      country: "Việt Nam",
    },
  ],
  "tram-lang": [
    {
      title: "Nhà Tù Shawshank",
      originalTitle: "The Shawshank Redemption",
      punchline: "Bộ phim số 1 lịch sử điện ảnh về hy vọng, lòng kiên nhẫn và tự do đích thực.",
      badges: ["Kiệt Tác", "Hy Vọng", "Số 1 IMDb"],
      country: "Âu Mỹ",
    },
    {
      title: "Điều Kỳ Diệu Ở Phòng Giam Số 7",
      originalTitle: "Miracle in Cell No. 7",
      punchline: "Tình cha con bất diệt lay động hàng triệu trái tim, chuẩn bị sẵn khăn giấy trước khi xem.",
      badges: ["Gia Đình", "Cảm Động", "Lấy Nước Mắt"],
      country: "Hàn Quốc",
    },
    {
      title: "Kẻ Đuổi Theo Bóng Ma",
      originalTitle: "Manchester by the Sea",
      punchline: "Hành trình đối diện với nỗi đau và học cách sống tiếp một cách chân thực nhất.",
      badges: ["Tâm Lý", "Lắng Đọng", "Sâu Sắc"],
      country: "Âu Mỹ",
    },
    {
      title: "Tôi Và Chúng Ta",
      originalTitle: "Our Beloved Summer",
      punchline: "Chuyện tình 10 năm của hai người trẻ với những xúc cảm tinh tế và chữa lành tâm hồn.",
      badges: ["Chữa Lành", "Hàn Quốc", "Cảm Xúc"],
      country: "Hàn Quốc",
    },
  ],
  "kinh-di": [
    {
      title: "Ám Ảnh Kinh Hoàng",
      originalTitle: "The Conjuring",
      punchline: "Đỉnh cao kinh dị trừ tà có thật của vợ chồng nhà Warren sẽ làm bạn lạnh gáy trong đêm tối.",
      badges: ["Rùng Rợn", "Trừ Tà", "Căng Thẳng"],
      country: "Âu Mỹ",
    },
    {
      title: "Di Truyền",
      originalTitle: "Hereditary",
      punchline: "Nỗi sợ hãi tâm lý kỳ dị và ma mị len lỏi vào tận xương tủy khiến bạn khó ngủ.",
      badges: ["Kinh Dị", "Tâm Lý", "Ám Ảnh"],
      country: "Âu Mỹ",
    },
    {
      title: "Âm Hồn Nhập Xác",
      originalTitle: "The Medium",
      punchline: "Phong cách giả tài liệu rùng rợn vùng Đông Bắc Thái Lan về thế giới tâm linh tà thuật.",
      badges: ["Thái Lan", "Tâm Linh", "Ám Ảnh"],
      country: "Thái Lan",
    },
    {
      title: "Quỷ Ám",
      originalTitle: "Exhuma",
      punchline: "Màn quật mộ khai quật bí mật kinh hoàng làm khuynh đảo phòng vé châu Á.",
      badges: ["Hàn Quốc", "Kinh Dị", "Tâm Linh"],
      country: "Hàn Quốc",
    },
    {
      title: "Chuyện Ma Gần Nhà",
      originalTitle: "Vietnamese Horror Story",
      punchline: "Tuyển tập những truyền thuyết đô thị ma mị đậm màu sắc văn hóa dân gian Việt Nam.",
      badges: ["Việt Nam", "Ma Quái", "Hồi Hộp"],
      country: "Việt Nam",
    },
  ],
  "vien-tuong": [
    {
      title: "Thế Thân: Dòng Chảy Của Nước",
      originalTitle: "Avatar: The Way of Water",
      punchline: "Bữa tiệc thị giác đỉnh cao đưa bạn đắm chìm vào đại dương kỳ vĩ của hành tinh Pandora.",
      badges: ["3D Đỉnh Cao", "Vũ Trụ", "Bom Tấn"],
      country: "Âu Mỹ",
    },
    {
      title: "Hành Tinh Cát",
      originalTitle: "Dune: Part Two",
      punchline: "Sử thi điện ảnh không gian vĩ đại với âm thanh và hình ảnh xứng tầm kiệt tác.",
      badges: ["Khoa Học", "Sử Thi", "Mãn Nhãn"],
      country: "Âu Mỹ",
    },
    {
      title: "Ma Trận",
      originalTitle: "The Matrix",
      punchline: "Khái niệm thế giới ảo định hình cả một thời đại cùng phong cách hành động huyền thoại.",
      badges: ["Kinh Điển", "Khoa Học", "Hành Động"],
      country: "Âu Mỹ",
    },
  ],
  "anime": [
    {
      title: "Vùng Đất Linh Hồn",
      originalTitle: "Spirited Away",
      punchline: "Hành trình trưởng thành kỳ diệu của cô bé Chihiro trong thế giới thần linh rực rỡ.",
      badges: ["Ghibli", "Oscar", "Kiệt Tác"],
      country: "Nhật Bản",
    },
    {
      title: "Tên Cậu Là Gì?",
      originalTitle: "Your Name",
      punchline: "Sợi dây duyên phận vượt không gian và thời gian với phần đồ họa và âm nhạc đẹp mê hồn.",
      badges: ["Makoto Shinkai", "Cảm Động", "Lãng Mạn"],
      country: "Nhật Bản",
    },
    {
      title: "Thanh Gươm Diệt Quỷ: Chuyến Tàu Vô Tận",
      originalTitle: "Demon Slayer: Mugen Train",
      punchline: "Trận chiến rực lửa của Viêm Trụ Rengoku khiến cả khán phòng bùng nổ cảm xúc!",
      badges: ["Anime", "Hành Động", "Xúc Động"],
      country: "Nhật Bản",
    },
  ],
  "co-trang": [
    {
      title: "Trần Tình Lệnh",
      originalTitle: "The Untamed",
      punchline: "Tuyệt phẩm tiên hiệp huynh đệ kinh điển làm mưa làm gió toàn châu Á.",
      badges: ["Tiên Hiệp", "Trung Quốc", "Huyền Thoại"],
      country: "Trung Quốc",
    },
    {
      title: "Chân Hoàn Truyện",
      originalTitle: "Empresses in the Palace",
      punchline: "Bức tranh cung đấu đỉnh cao với những màn tranh sủng và đấu trí tàn khốc bậc nhất.",
      badges: ["Cung Đấu", "Kinh Điển", "Trung Quốc"],
      country: "Trung Quốc",
    },
    {
      title: "Khánh Dư Niên",
      originalTitle: "Joy of Life",
      punchline: "Màn xuyên không đấu trí quyền mưu lôi cuốn hài hước nhưng không kém phần kịch tính.",
      badges: ["Quyền Mưu", "Cổ Trang", "Hài Hước"],
      country: "Trung Quốc",
    },
  ],
  "toi-pham": [
    {
      title: "Bố Già",
      originalTitle: "The Godfather",
      punchline: "Bức tượng đài bất hủ của dòng phim mafia với những bài học cuộc đời sâu sắc.",
      badges: ["Mafia", "Kinh Điển", "Kiệt Tác"],
      country: "Âu Mỹ",
    },
    {
      title: "Kỵ Sĩ Bóng Đêm",
      originalTitle: "The Dark Knight",
      punchline: "Màn đối đầu lịch sử giữa Batman và Joker - phản diện xuất sắc nhất mọi thời đại.",
      badges: ["Batman", "Joker", "Đỉnh Cao"],
      country: "Âu Mỹ",
    },
    {
      title: "Vô Gian Đạo",
      originalTitle: "Infernal Affairs",
      punchline: "Cuộc chiến nội gián cân não giữa cảnh sát và xã hội đen Hồng Kông không thể nào quên.",
      badges: ["Hồng Kông", "Nội Gián", "Kinh Điển"],
      country: "Hồng Kông",
    },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafePoster(item: any): string {
  if (typeof item?.poster_url === "string" && item.poster_url.startsWith("http")) return item.poster_url;
  if (typeof item?.thumb_url === "string" && item.thumb_url.startsWith("http")) return item.thumb_url;
  return "/default-hero.jpg";
}

const COUNTRY_LABELS: Record<string, string> = {
  all: "Mọi quốc gia (Toàn cầu)",
  "han-quoc": "Hàn Quốc",
  "au-my": "Âu Mỹ / Hollywood",
  "trung-quoc": "Trung Quốc",
  "nhat-ban": "Nhật Bản",
  "viet-nam": "Việt Nam",
  "thai-lan": "Thái Lan",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mood: string = body.mood || "xa-stress";
    const country: string = body.country || "all";
    const companion: string = body.companion || "mot-minh";
    const duration: string = body.duration || "phim-le";
    const excludeSlugs: string[] = Array.isArray(body.excludeSlugs) ? body.excludeSlugs : [];
    const excludeTitles: string[] = Array.isArray(body.excludeTitles) ? body.excludeTitles : [];
    const userApiKey: string = body.apiKey || "";

    const countryLabel = COUNTRY_LABELS[country] || "Tự do";
    const hasExclusions = excludeSlugs.length > 0 || excludeTitles.length > 0;

    // Cache key chỉ dùng khi quay lần đầu không có exclusion
    const cacheKey = `${mood}_${country}_${companion}_${duration}_${Math.floor(Date.now() / (1000 * 60 * 30))}`;
    if (!hasExclusions) {
      const cached = ROULETTE_CACHE.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached.data, fromCache: true });
      }
    }

    const envKeys = (process.env.GEMINI_API_KEY || "")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 5);

    const candidateKeys = Array.from(
      new Set(
        [...envKeys, userApiKey?.trim()].filter(
          (k): k is string => Boolean(k && k.length > 5)
        )
      )
    );

    let chosenTitle = "";
    let chosenOriginal = "";
    let punchline = "";
    let badges = ["Đề Xuất AI", "Đặc Sắc"];
    let matchScore = 98;
    const provider = "Nana AI";

    const allExclusions = Array.from(
      new Set([...excludeTitles, ...excludeSlugs].map((s) => s.toLowerCase().trim()))
    );

    // 1. GỌI GEMINI NẾU CÓ KEY (TỰ ĐỘNG XOAY VÒNG KEY NẾU GẶP QUOTA 429)
    if (candidateKeys.length > 0) {
      try {
        const excludePrompt = hasExclusions
          ? `\nQUAN TRỌNG: TUYỆT ĐỐI KHÔNG CHỌN bất kỳ phim nào trong danh sách đã xem/bỏ qua sau: [${allExclusions.slice(-15).join(", ")}]. Phải chọn 1 phim KHÁC BIỆT HOÀN TOÀN!`
          : "";

        const promptText = `Người dùng đang chơi vòng quay 'Suất Chiếu Định Mệnh' để tìm 1 phim:
- Tâm trạng: "${mood}"
- Ưu tiên quốc gia: "${countryLabel}"
- Người xem cùng: "${companion}"
- Thời lượng/Thể loại: "${duration}"${excludePrompt}

Hãy chọn DUY NHẤT 1 bộ phim điện ảnh hoặc phim bộ kinh điển, nổi tiếng, đánh giá cao đáp ứng đúng ngữ cảnh này.
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không markdown block):
{
  "title": "Tên phim tiếng Việt",
  "originalTitle": "Tên gốc hoặc tiếng Anh",
  "punchline": "1 câu giật gân, hài hước hoặc lôi cuốn (tối đa 25 từ) giải thích lý do Nana chọn phim này",
  "badges": ["3 từ khóa ngắn", "đại diện", "vibe"],
  "matchScore": 99
}`;

        const MODELS = ["gemini-3.5-flash", "gemini-3.6-flash"];
        let raceResult: string | null = null;

        keyLoop: for (const currentKey of candidateKeys) {
          try {
            const ai = new GoogleGenAI({ apiKey: currentKey, vertexai: false });
            for (const model of MODELS) {
              try {
                const is35 = model.includes("3.5");
                const res = await Promise.race([
                  ai.models.generateContent({
                    model,
                    contents: promptText,
                    config: {
                      responseMimeType: "application/json",
                      temperature: 0.85,
                      maxOutputTokens: 400,
                      ...(is35
                        ? { thinkingConfig: { thinkingBudget: 0 } }
                        : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
                    },
                  }),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`${model} roulette timeout`)), 4000)
                  ),
                ]);

                const text = res.text?.trim();
                if (text) {
                  raceResult = text;
                  break keyLoop;
                }
              } catch (mErr) {
                console.warn(
                  `[ai-roulette] ${model} failed:`,
                  mErr instanceof Error ? mErr.message : mErr
                );
              }
            }
          } catch (kErr) {
            console.warn(
              "[ai-roulette] Key failed, trying fallback key:",
              kErr instanceof Error ? kErr.message : kErr
            );
          }
        }

        if (raceResult) {
          let cleaned = raceResult.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) cleaned = jsonMatch[0];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let parsed: any = null;
          try {
            parsed = JSON.parse(cleaned);
          } catch {
            const titleM = cleaned.match(/"title"\s*:\s*"((?:\\.|[^"\\])*)"/);
            const origM = cleaned.match(/"originalTitle"\s*:\s*"((?:\\.|[^"\\])*)"/);
            const punchM = cleaned.match(/"punchline"\s*:\s*"((?:\\.|[^"\\])*)"/);
            if (titleM) {
              parsed = {
                title: titleM[1],
                originalTitle: origM ? origM[1] : "",
                punchline: punchM ? punchM[1] : "Tác phẩm xuất sắc được tuyển chọn cho bạn!",
                badges: ["Đề Xuất AI", "Đặc Sắc"],
                matchScore: 98,
              };
            }
          }

          if (parsed && parsed.title) {
            const candidateTitle = parsed.title.trim().toLowerCase();
            const candidateOriginal = (parsed.originalTitle || "").trim().toLowerCase();
            // Đảm bảo không trùng danh sách exclude
            const isExcluded = allExclusions.some(
              (t) => t === candidateTitle || (candidateOriginal && t === candidateOriginal)
            );
            if (!isExcluded) {
              chosenTitle = parsed.title.trim();
              chosenOriginal = parsed.originalTitle || "";
              punchline = parsed.punchline || "Tác phẩm xuất sắc nhất được AI lựa chọn cho bạn!";
              if (Array.isArray(parsed.badges)) badges = parsed.badges.slice(0, 3);
              if (typeof parsed.matchScore === "number") matchScore = parsed.matchScore;
            }
          }
        }
      } catch (geminiErr) {
        console.warn("[ai-roulette] Gemini fallback:", geminiErr instanceof Error ? geminiErr.message : geminiErr);
      }
    }

    // 2. NẾU KHÔNG CÓ KẾT QUẢ GEMINI HOẶC BỊ TRÙNG -> LẤY TỪ KHO OFFLINE TUYỂN CHỌN
    if (!chosenTitle) {
      let pool = CURATED_OFFLINE_PICKS[mood] || CURATED_OFFLINE_PICKS["xa-stress"];
      
      // Nếu có filter country, ưu tiên các phim đúng country nếu có
      if (country !== "all") {
        const countryName = COUNTRY_LABELS[country] || "";
        const filteredByCountry = pool.filter((p) => p.country && countryName.includes(p.country));
        if (filteredByCountry.length > 0) {
          pool = filteredByCountry;
        }
      }

      // Lọc bỏ những phim đã xem
      let availablePicks = pool.filter(
        (p) =>
          !allExclusions.includes(p.title.toLowerCase()) &&
          !allExclusions.includes(p.originalTitle.toLowerCase())
      );

      // Nếu đã xem hết danh sách của mood đó, lấy từ toàn bộ kho
      if (availablePicks.length === 0) {
        const allPicks = Object.values(CURATED_OFFLINE_PICKS).flat();
        availablePicks = allPicks.filter(
          (p) =>
            !allExclusions.includes(p.title.toLowerCase()) &&
            !allExclusions.includes(p.originalTitle.toLowerCase())
        );
      }

      if (availablePicks.length === 0) {
        availablePicks = pool;
      }

      const randomPick = availablePicks[Math.floor(Math.random() * availablePicks.length)];
      chosenTitle = randomPick.title;
      chosenOriginal = randomPick.originalTitle;
      punchline = randomPick.punchline;
      badges = randomPick.badges;
    }

    // 3. TÌM CHI TIẾT PHIM TRONG HỆ THỐNG (LOẠI TRỪ CÁC SLUG ĐÃ QUAY)
    let foundMovie = null;
    const isExcludedMovie = (item: { slug?: string; name?: string; title?: string; origin_name?: string }) => {
      if (!item) return true;
      const slug = (item.slug || "").toLowerCase();
      const name = (item.name || item.title || "").toLowerCase();
      const origin = (item.origin_name || "").toLowerCase();
      return (
        allExclusions.includes(slug) ||
        (name && allExclusions.includes(name)) ||
        (origin && allExclusions.includes(origin))
      );
    };

    if (chosenTitle) {
      const res1 = await movieApi.getMovies({ keyword: chosenTitle, page: 1, limit: 5 }).catch(() => null);
      if (res1?.items?.length) {
        foundMovie = res1.items.find((it: { slug: string; name?: string; origin_name?: string }) => !isExcludedMovie(it));
        if (!foundMovie && !hasExclusions) foundMovie = res1.items[0];
      }
    }
    if (!foundMovie && chosenOriginal) {
      const res2 = await movieApi.getMovies({ keyword: chosenOriginal, page: 1, limit: 5 }).catch(() => null);
      if (res2?.items?.length) {
        foundMovie = res2.items.find((it: { slug: string; name?: string; origin_name?: string }) => !isExcludedMovie(it));
        if (!foundMovie && !hasExclusions) foundMovie = res2.items[0];
      }
    }

    // Nếu vẫn chưa ra, lấy ngẫu nhiên 1 phim khác trong kho chưa từng quay
    if (!foundMovie) {
      for (let p = 1; p <= 3; p++) {
        const fallbackRes = await movieApi.getMovies({ page: p, limit: 12 }).catch(() => null);
        if (fallbackRes?.items?.length) {
          foundMovie = fallbackRes.items.find((it: { slug: string; name?: string; origin_name?: string }) => !isExcludedMovie(it));
          if (foundMovie) break;
        }
      }
    }

    const payload = {
      movie: {
        slug: foundMovie?.slug || "avatar",
        title: foundMovie?.name || foundMovie?.title || chosenTitle,
        originalTitle: foundMovie?.origin_name || chosenOriginal || chosenTitle,
        poster: toSafePoster(foundMovie),
        year: foundMovie?.year || 2024,
        quality: foundMovie?.quality || "FHD",
        category: foundMovie?.category?.[0]?.name || "Đặc sắc",
        country: foundMovie?.country?.[0]?.name || "Quốc tế",
        episodeCurrent: foundMovie?.episode_current || "Trọn bộ",
      },
      punchline,
      badges,
      matchScore: Math.min(99, Math.max(92, matchScore)),
      provider,
    };

    if (!hasExclusions) {
      ROULETTE_CACHE.set(cacheKey, { data: payload, cachedAt: Date.now() });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[ai-roulette] Internal Error:", error);
    return NextResponse.json(
      { error: "Không thể quay suất chiếu lúc này, vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
