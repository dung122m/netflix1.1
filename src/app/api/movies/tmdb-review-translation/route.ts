import { NextRequest, NextResponse } from "next/server";
import { cacheService } from "@/lib/cache";

export const runtime = "nodejs";

const TRANSLATION_CACHE_TTL = 30 * 86400; // 30 ngày (2,592,000s)

/**
 * Dịch văn bản sang tiếng Việt trực tiếp sử dụng Google NMT Translation Endpoint (Hoàn toàn miễn phí, không bị chặn Captcha)
 */
async function translateWithGoogleNMT(text: string): Promise<string> {
  // Phương thức 1: Endpoint Google Clients5 Chrome Extension (POST - Không giới hạn độ dài URL, không bị captcha chặn)
  try {
    const res = await fetch("https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=vi", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      body: `q=${encodeURIComponent(text)}`,
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        if (Array.isArray(data[0]) && typeof data[0][0] === "string") {
          const joined = data
            .map((seg: unknown) => (Array.isArray(seg) && typeof seg[0] === "string" ? seg[0] : ""))
            .join("");
          if (joined.trim()) return joined.trim();
        }
        if (typeof data[0] === "string" && data[0].trim()) {
          return data[0].trim();
        }
      }
    }
  } catch (err) {
    console.warn("[TMDB Translation API] Primary clients5 POST failed, attempting GET fallback:", err);
  }

  // Phương thức 2: Dự phòng GET clients5
  try {
    const getUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=vi&q=${encodeURIComponent(
      text.slice(0, 2000)
    )}`;
    const res = await fetch(getUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === "string") {
        const joined = data
          .map((seg: unknown) => (Array.isArray(seg) && typeof seg[0] === "string" ? seg[0] : ""))
          .join("");
        if (joined.trim()) return joined.trim();
      }
    }
  } catch (err) {
    console.warn("[TMDB Translation API] Secondary clients5 GET failed:", err);
  }

  throw new Error("Không thể kết nối đến máy chủ dịch thuật lúc này");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Yêu cầu không hợp lệ." },
        { status: 400 }
      );
    }

    const rawReviewId = body.reviewId;
    const rawText = body.text;

    // Validate reviewId
    if (!rawReviewId || typeof rawReviewId !== "string" || !rawReviewId.trim()) {
      return NextResponse.json(
        { error: "Thiếu hoặc sai định dạng reviewId." },
        { status: 400 }
      );
    }
    const cleanReviewId = rawReviewId.trim().slice(0, 128);

    // Validate text
    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json(
        { error: "Thiếu hoặc rỗng nội dung đánh giá." },
        { status: 400 }
      );
    }

    const cleanText = rawText.trim();
    if (cleanText.length > 10000) {
      return NextResponse.json(
        { error: "Độ dài đánh giá vượt quá giới hạn cho phép (10,000 ký tự)." },
        { status: 400 }
      );
    }

    // 1. Kiểm tra Cache Nanaflix (L1 In-Memory + L2 Redis)
    const cacheKey = `tmdb:review_translation:vi:${cleanReviewId}`;
    const cachedTranslation = await cacheService.get<string>(cacheKey);

    if (cachedTranslation && typeof cachedTranslation === "string" && cachedTranslation.trim()) {
      return NextResponse.json(
        {
          success: true,
          reviewId: cleanReviewId,
          translation: cachedTranslation,
          cached: true,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=86400",
          },
        }
      );
    }

    // 2. Cache miss -> Dịch trực tiếp bằng Google NMT Endpoint
    const translatedText = await translateWithGoogleNMT(cleanText);

    if (!translatedText) {
      return NextResponse.json(
        { error: "Không thể dịch nội dung đánh giá." },
        { status: 500 }
      );
    }

    // 3. Lưu vào hệ thống Cache Nanaflix với TTL 30 ngày
    await cacheService.set(cacheKey, translatedText, TRANSLATION_CACHE_TTL).catch((err) => {
      console.warn(`[TMDB Translation Cache] Failed to save key ${cacheKey}:`, err);
    });

    return NextResponse.json(
      {
        success: true,
        reviewId: cleanReviewId,
        translation: translatedText,
        cached: false,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[TMDB Translation API] Error handling request:", err);
    return NextResponse.json(
      {
        error: "Đã xảy ra lỗi khi dịch bài đánh giá.",
      },
      { status: 500 }
    );
  }
}
