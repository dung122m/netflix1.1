import { NextRequest, NextResponse } from "next/server";

interface MovieInsight {
  vibe: string;
  targetAudience: string;
  hook: string;
  matchScore: number;
  highlightBadges: string[];
  provider: string;
}

// BỘ NHỚ ĐỆM CHO CÁC PHIM (LƯU 24 GIỜ TRÁNH GỌI GEMINI LẶP LẠI -> TIẾT KIỆM 100% TOKEN)
const INSIGHT_CACHE = new Map<string, { data: MovieInsight; cachedAt: number }>();
const INSIGHT_TTL = 24 * 60 * 60 * 1000; // 24 giờ

// BỘ TẠO NHẬN ĐỊNH BẰNG THUẬT TOÁN ĐỊA PHƯƠNG (0 TOKEN FALLBACK)
function generateLocalInsight(params: {
  title: string;
  category?: string;
  country?: string;
  year?: number | string;
  quality?: string;
}): MovieInsight {
  const { title, category = "", country = "", year = 2024 } = params;
  const cat = category.toLowerCase();
  const ctry = country.toLowerCase();

  let vibe = "Kịch tính, cuốn hút và giàu cảm xúc";
  let targetAudience = "Khán giả yêu thích những câu chuyện điện ảnh có chiều sâu";
  let hook = `Cốt truyện hấp dẫn cùng nhịp phim giữ chân người xem từ đầu đến cuối`;
  let badges = ["Đặc Sắc", "Đáng Xem", "Trending"];
  let score = 92;

  if (cat.includes("hành động") || cat.includes("action")) {
    vibe = "Mãn nhãn, dồn dập và nghẹt thở từng phút giây 💥";
    targetAudience = "Fan của những pha combat đỉnh cao và rượt đuổi kịch tính";
    hook = `Những màn giao tranh võ thuật và kỹ xảo điện ảnh đỉnh chóp`;
    badges = ["Hành Động Đỉnh", "Kỹ Xảo Chuẩn Rạp", "Adrenaline Cao"];
    score = 95;
  } else if (cat.includes("tình cảm") || cat.includes("lãng mạn") || cat.includes("romance")) {
    vibe = "Ngọt ngào, sâu lắng và rung động từng xúc cảm 💖";
    targetAudience = "Những ai muốn tìm kiếm sự chữa lành và niềm tin vào tình yêu";
    hook = `Phản ứng hóa học bùng nổ cùng những thước phim thơ mộng`;
    badges = ["Ngọt Ngào", "Chữa Lành", "Phản Ứng Bùng Nổ"];
    score = 94;
  } else if (cat.includes("kinh dị") || cat.includes("horror") || cat.includes("ma")) {
    vibe = "Rùng rợn, u ám và lạnh gáy trong bóng tối 👻";
    targetAudience = "Tín đồ cảm giác mạnh và đam mê bóc tách bí ẩn tâm linh";
    hook = `Bầu không khí căng thẳng nghẹt thở cùng những cú jumpscare thót tim`;
    badges = ["Rùng Rợn", "Không Khí U Ám", "Cảm Giác Mạnh"];
    score = 91;
  } else if (cat.includes("hài") || cat.includes("comedy")) {
    vibe = "Duyên dáng, hóm hỉnh và giải tỏa mọi áp lực 🤣";
    targetAudience = "Thích hợp xem cùng bạn bè hoặc thư giãn sau ngày dài bận rộn";
    hook = `Những mảng miếng hài hước thông minh không hề gượng ép`;
    badges = ["Cười Thả Ga", "Xả Stress", "Xem Cùng Bạn Bè"];
    score = 93;
  } else if (cat.includes("hoạt hình") || cat.includes("anime")) {
    vibe = "Màu sắc diệu kỳ, giàu trí tưởng tượng và đong đầy xúc cảm 🎨";
    targetAudience = "Mọi lứa tuổi yêu thích nghệ thuật đồ họa và thế giới huyền ảo";
    hook = `Nét vẽ tuyệt mỹ truyền tải thông điệp nhân văn sâu sắc`;
    badges = ["Đồ Họa Tuyệt Đẹp", "Mọi Lứa Tuổi", "Chữa Lành"];
    score = 96;
  } else if (cat.includes("tâm lý") || cat.includes("trinh thám")) {
    vibe = "Căng não, đa tầng ý nghĩa và những cú twist khó lường 🧠";
    targetAudience = "Người thích suy luận, bóc tách tâm lý tội phạm và đấu trí";
    hook = `Kịch bản cài cắm chi tiết tinh vi khiến bạn phải ồ lên ở phút cuối`;
    badges = ["Plot Twist", "Căng Não", "Kịch Bản Xuất Sắc"];
    score = 97;
  } else if (cat.includes("cổ trang") || cat.includes("kiếm hiệp")) {
    vibe = "Hùng tráng, giang hồ nghĩa hiệp và bối cảnh tráng lệ 🏯";
    targetAudience = "Mê mẩn thế giới võ lâm tiên hiệp và ân oán tình thù";
    hook = `Tạo hình cổ phong mãn nhãn cùng kỹ xảo huyền ảo`;
    badges = ["Cổ Phong Tuyệt Mỹ", "Ân Oán Giang Hồ", "Tạo Hình Đỉnh"];
    score = 94;
  }

  if (ctry.includes("hàn quốc") || ctry.includes("korea")) {
    badges.push("K-Drama Chuẩn");
  } else if (ctry.includes("trung quốc") || ctry.includes("china")) {
    badges.push("Điện Ảnh Hoa Ngữ");
  }

  return {
    vibe,
    targetAudience,
    hook,
    matchScore: score,
    highlightBadges: badges.slice(0, 3),
    provider: "Nanaflix Neural Engine (0 Token)",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slug: string = body.slug?.trim() || "";
    const title: string = body.title?.trim() || "";
    const category: string = body.category || "";
    const country: string = body.country || "";
    const synopsis: string = (body.synopsis || "").slice(0, 300); // Cắt ngắn để tiết kiệm token
    const year = body.year || 2024;

    if (!slug || !title) {
      return NextResponse.json({ error: "Thiếu thông tin phim" }, { status: 400 });
    }

    // 1. KIỂM TRA CACHE TRƯỚC (TIẾT KIỆM 100% TOKEN)
    const cached = INSIGHT_CACHE.get(slug);
    if (cached && Date.now() - cached.cachedAt < INSIGHT_TTL) {
      return NextResponse.json({ ...cached.data, fromCache: true });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    // 2. GỌI GEMINI NẾU CÓ KEY (SIÊU TIẾT KIỆM: CHỈ ~150 PROMPT TOKEN + 150 OUTPUT TOKEN)
    if (apiKey && apiKey.length > 5) {
      try {
        const miniPrompt = `Phim: "${title}", thể loại: "${category}", quốc gia: "${country}".
Tóm tắt ngắn: "${synopsis}".
Hãy đóng vai chuyên gia điện ảnh, đưa ra nhận định chớp nhoáng (tối đa 30 từ mỗi mục).
Trả về duy nhất JSON hợp lệ (không markdown block):
{
  "vibe": "1 câu ngắn gọn về phong cách, không khí phim (kèm 1 emoji)",
  "targetAudience": "1 câu ngắn về đối tượng khán giả phù hợp nhất",
  "hook": "1 câu ngắn chỉ ra điểm cuốn hút nhất đáng xem",
  "matchScore": 95,
  "highlightBadges": ["Hấp Dẫn", "Căng Não", "Siêu Phẩm"]
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: miniPrompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.6,
                maxOutputTokens: 250, // Rất ngắn, siêu tiết kiệm token
              },
            }),
            signal: AbortSignal.timeout(6000),
          }
        );

        if (geminiRes.ok) {
          const resData = await geminiRes.json();
          let rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
          rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
          const parsed = JSON.parse(rawText);

          if (parsed.vibe && parsed.targetAudience) {
            const insightResult: MovieInsight = {
              vibe: parsed.vibe,
              targetAudience: parsed.targetAudience,
              hook: parsed.hook || "Một tác phẩm đáng để dành thời gian thưởng thức",
              matchScore: typeof parsed.matchScore === "number" ? parsed.matchScore : 95,
              highlightBadges: Array.isArray(parsed.highlightBadges) && parsed.highlightBadges.length > 0
                ? parsed.highlightBadges.slice(0, 3)
                : ["Đặc Sắc", "Đề Xuất", "Chất Lượng"],
              provider: "Google Gemini AI",
            };

            // Lưu cache 24h
            INSIGHT_CACHE.set(slug, { data: insightResult, cachedAt: Date.now() });
            return NextResponse.json(insightResult);
          }
        }
      } catch (err) {
        console.warn("Lỗi gọi Gemini Insight, chuyển sang engine cục bộ:", err);
      }
    }

    // 3. NẾU KHÔNG CÓ GEMINI HOẶC LỖI -> DÙNG THUẬT TOÁN ĐỊA PHƯƠNG (0 TOKEN)
    const localInsight = generateLocalInsight({ title, category, country, year });
    INSIGHT_CACHE.set(slug, { data: localInsight, cachedAt: Date.now() });

    return NextResponse.json(localInsight);
  } catch (error) {
    console.error("Lỗi POST /api/ai-insight:", error);
    return NextResponse.json(
      { error: "Không thể tạo nhận định AI lúc này" },
      { status: 500 }
    );
  }
}
