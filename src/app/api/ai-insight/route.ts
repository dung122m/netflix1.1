import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export interface MovieEmotionalInsight {
  actionScore: number;     // 💥 Kịch tính & Hồi hộp (0-100)
  emotionScore: number;    // 😭 Cảm động & Sâu lắng (0-100)
  twistScore: number;      // 🤯 Bất ngờ & Plot Twist (0-100)
  chillScore: number;      // 🛋️ Thư giãn & Hài hước (0-100)
  bingeScore: number;      // 🍿 Độ cuốn & Hút mắt (0-100)
  vibeSummary: string;     // Đánh giá tổng quan phong cách & không khí phim
  contentWarning: string;  // Lưu ý xem phim (Spoiler-free)
  bestTimeToWatch: string; // Thời điểm xem thích hợp nhất
  highlightBadges: string[];
  provider: string;
}

// BỘ NHỚ ĐỆM 30 NGÀY CHO MỖI PHIM (TIẾT KIỆM 100% TOKEN CHO CÁC LẦN TRUY CẬP SAU)
const EMOTIONAL_CACHE = new Map<string, { data: MovieEmotionalInsight; cachedAt: number }>();
const CACHE_30_DAYS = 30 * 24 * 60 * 60 * 1000;

/**
 * Thuật toán tính toán cảm xúc địa phương (0 TOKEN FALLBACK)
 */
function calculateLocalEmotionalRadar(params: {
  title?: string;
  category?: string;
  country?: string;
  year?: number | string;
}): MovieEmotionalInsight {
  const { category = "", country = "" } = params;
  const cat = category.toLowerCase();
  const ctry = country.toLowerCase();

  let action = 65;
  let emotion = 60;
  let twist = 55;
  let chill = 50;
  let binge = 85;
  let vibe = "Cốt truyện hấp dẫn, kịch bản cuốn hút và giữ nhịp độ tốt";
  let warning = "Phim xem thoải mái, phù hợp cho mọi khán giả yêu điện ảnh";
  let time = "Thích hợp xem vào buổi tối hoặc những ngày nghỉ cuối tuần";
  const badges = ["Đặc Sắc", "Đáng Xem"];

  if (cat.includes("hành động") || cat.includes("action") || cat.includes("võ thuật")) {
    action = 92;
    twist = 70;
    chill = 30;
    binge = 94;
    vibe = "Mãn nhãn, tiết tấu dồn dập và nghẹt thở từng phút giây 💥";
    warning = "Cảnh giác với nhịp tim tăng nhanh do các pha giao tranh đỉnh cao!";
    time = "Xem khi cần nạp năng lượng adrenaline và bùng nổ cảm xúc";
    badges.push("Hành Động 92%", "Adrenaline Cao");
  } else if (cat.includes("tình cảm") || cat.includes("lãng mạn") || cat.includes("romance")) {
    emotion = 95;
    action = 20;
    chill = 80;
    binge = 88;
    vibe = "Ngọt ngào, sâu lắng và rung động từng cung bậc cảm xúc 💖";
    warning = "Nên chuẩn bị sẵn khăn giấy cho những phân cảnh chạm tới trái tim";
    time = "Lý tưởng xem cùng người thương hoặc những đêm tĩnh lặng một mình";
    badges.push("Cảm Động 95%", "Chữa Lành");
  } else if (cat.includes("kinh dị") || cat.includes("horror") || cat.includes("ma")) {
    action = 75;
    twist = 88;
    chill = 15;
    binge = 90;
    vibe = "Rùng rợn, lạnh gáy và bầu không khí u ám bao trùm 👻";
    warning = "Khuyến cáo không nên xem một mình trong bóng tối nếu yếu tim!";
    time = "Thích hợp xem đêm khuya để trải nghiệm trọn vẹn cảm giác rùng mình";
    badges.push("Rùng Rợn 88%", "Thót Tim");
  } else if (cat.includes("hài") || cat.includes("comedy")) {
    chill = 95;
    emotion = 50;
    action = 30;
    binge = 89;
    vibe = "Hóm hỉnh, duyên dáng và xua tan mọi âu lo mệt mỏi 🤣";
    warning = "Coi chừng cười nghiêng ngả vì các mảng miếng bất ngờ!";
    time = "Xem để xả stress sau một ngày làm việc học tập căng thẳng";
    badges.push("Hài Hước 95%", "Cười Thả Ga");
  } else if (cat.includes("tâm lý") || cat.includes("trinh thám") || cat.includes("bí ẩn")) {
    twist = 96;
    action = 60;
    chill = 25;
    binge = 95;
    vibe = "Căng não, đa tầng ý nghĩa và những cú bẻ lái không thể đoán trước 🧠";
    warning = "Đừng bỏ lỡ từng chi tiết nhỏ vì đều là chìa khóa mở nút thắt cuối cùng!";
    time = "Xem khi tinh thần tỉnh táo, thích đọ trí và suy luận logic";
    badges.push("Plot Twist 96%", "Căng Não");
  } else if (cat.includes("hoạt hình") || cat.includes("anime")) {
    chill = 85;
    emotion = 80;
    binge = 92;
    vibe = "Thế giới rực rỡ sắc màu, giàu trí tưởng tượng và chan chứa tình người 🎨";
    warning = "Phù hợp cho cả gia đình cùng quây quần thưởng thức";
    time = "Xem vào những buổi chiều thảnh thơi hoặc dịp sum họp gia đình";
    badges.push("Đồ Họa Đỉnh", "Ý Nghĩa");
  }

  if (ctry.includes("hàn quốc")) badges.push("K-Drama");
  if (ctry.includes("âu mỹ") || ctry.includes("mỹ")) badges.push("Hollywood");

  return {
    actionScore: action,
    emotionScore: emotion,
    twistScore: twist,
    chillScore: chill,
    bingeScore: binge,
    vibeSummary: vibe,
    contentWarning: warning,
    bestTimeToWatch: time,
    highlightBadges: Array.from(new Set(badges)).slice(0, 3),
    provider: "Nana AI",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug: string = body.slug?.trim() || "";
    const title: string = body.title?.trim() || "";
    const category: string = body.category || "";
    const country: string = body.country || "";
    const synopsis: string = (body.synopsis || "").slice(0, 280); // Tối ưu prompt ngắn gọn
    const year = body.year || 2024;

    if (!slug || !title) {
      return NextResponse.json({ error: "Thiếu thông tin phim" }, { status: 400 });
    }

    // 1. KIỂM TRA BỘ NHỚ ĐỆM TRƯỚC (TIẾT KIỆM 100% TOKEN)
    const cached = EMOTIONAL_CACHE.get(slug);
    if (cached && Date.now() - cached.cachedAt < CACHE_30_DAYS) {
      return NextResponse.json({ ...cached.data, fromCache: true });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    // 2. GỌI GEMINI NẾU CÓ KEY (SIÊU TIẾT KIỆM TOKEN: ~50 PROMPT TOKEN + 80 OUTPUT TOKEN)
    if (apiKey && apiKey.length > 5) {
      try {
        const miniPrompt = `Đánh giá chỉ số cảm xúc phim: "${title}", thể loại: "${category}". Tóm tắt: "${synopsis}".
Trả về DUY NHẤT JSON hợp lệ:
{
  "actionScore": 85,
  "emotionScore": 90,
  "twistScore": 95,
  "chillScore": 30,
  "bingeScore": 92,
  "vibeSummary": "1 câu ngắn gọn về không khí phim",
  "contentWarning": "1 câu lưu ý xem phim không spoiler",
  "bestTimeToWatch": "1 câu thời điểm xem thích hợp",
  "highlightBadges": ["Plot Twist 95%", "Cảm Động", "Mãn Nhãn"]
}`;

        const ai = new GoogleGenAI({ apiKey, vertexai: false });
        const RACE_MODELS = ["gemini-3.6-flash", "gemini-2.5-flash"];

        let rawText: string | null = null;
        for (const model of RACE_MODELS) {
          try {
            const result = await Promise.race([
              ai.models.generateContent({
                model,
                contents: miniPrompt,
                config: {
                  responseMimeType: "application/json",
                  temperature: 0.3,
                  maxOutputTokens: 250,
                },
              }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 2000)
              ),
            ]);
            const text = result.text?.trim();
            if (text) {
              rawText = text;
              break;
            }
          } catch {
            // Thử model tiếp theo
          }
        }

        if (rawText) {
          const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
          const parsed = JSON.parse(cleaned);

          if (typeof parsed.actionScore === "number") {
            const radarResult: MovieEmotionalInsight = {
              actionScore: Math.min(100, Math.max(10, parsed.actionScore)),
              emotionScore: Math.min(100, Math.max(10, parsed.emotionScore)),
              twistScore: Math.min(100, Math.max(10, parsed.twistScore)),
              chillScore: Math.min(100, Math.max(10, parsed.chillScore)),
              bingeScore: Math.min(100, Math.max(10, parsed.bingeScore || 90)),
              vibeSummary: parsed.vibeSummary || "Cốt truyện giàu cảm xúc và nhịp phim cuốn hút",
              contentWarning: parsed.contentWarning || "Phim mang tính giải trí cao, thích hợp cho nhiều đối tượng",
              bestTimeToWatch: parsed.bestTimeToWatch || "Thích hợp xem thư giãn vào buổi tối",
              highlightBadges: Array.isArray(parsed.highlightBadges) ? parsed.highlightBadges.slice(0, 3) : ["Đặc Sắc", "Chất Lượng"],
              provider: "Nana AI Radar",
            };

            EMOTIONAL_CACHE.set(slug, { data: radarResult, cachedAt: Date.now() });
            return NextResponse.json(radarResult);
          }
        }
      } catch (err) {
        console.warn("Gemini Radar error, fallback to local:", err);
      }
    }

    // 3. THUẬT TOÁN ĐỊA PHƯƠNG TỨC THÌ (0 TOKEN)
    const localRadar = calculateLocalEmotionalRadar({ title, category, country, year });
    EMOTIONAL_CACHE.set(slug, { data: localRadar, cachedAt: Date.now() });

    return NextResponse.json(localRadar);
  } catch (error) {
    console.error("Lỗi POST /api/ai-insight:", error);
    return NextResponse.json(
      { error: "Không thể tính toán chỉ số cảm xúc" },
      { status: 500 }
    );
  }
}
