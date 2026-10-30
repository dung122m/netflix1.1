import { NextRequest, NextResponse } from "next/server";
import { cacheService } from "@/lib/cache";

export const runtime = "nodejs";

const TMDB_API_KEY =
  process.env.TMDB_API_KEY ||
  process.env.NEXT_PUBLIC_TMDB_API_KEY ||
  "3fd2be6f0c70a2a598f084ddfb75487c";

// In-memory L1 cache (24h)
interface PosterCacheEntry {
  posterUrl: string | null;
  backdropUrl: string | null;
  expireAt: number;
}
const posterMemoryCache = new Map<string, PosterCacheEntry>();
const MEMORY_TTL = 24 * 60 * 60 * 1000;

function getSearchVariants(text: string): string[] {
  if (!text) return [];
  const res: string[] = [];
  const add = (s: string) => {
    const trimmed = (s || "").trim();
    if (trimmed.length >= 2 && !res.includes(trimmed)) res.push(trimmed);
  };
  add(text);
  const noSeason = text
    .replace(/\((?:Phần|Season|SS|Part)\s*\d+[^)]*\)/gi, "")
    .replace(/(?:Phần|Season|SS|Part)\s*\d+/gi, "")
    .replace(/\[[^\]]*\]/g, "")
    .trim();
  add(noSeason);

  const matches = text.match(/\(([^)]+)\)/g);
  if (matches) {
    for (const m of matches) {
      const inside = m.slice(1, -1).trim();
      if (!/^(Phần|Season|SS|Part)\s*\d+/i.test(inside)) {
        add(inside);
      }
    }
  }

  const noParens = text.replace(/\([^)]*\)/g, "").trim();
  add(noParens);

  return res;
}

async function queryTmdbPoster(query: string, year?: string): Promise<{ posterUrl: string | null; backdropUrl: string | null }> {
  if (!query || query.trim().length < 2) {
    return { posterUrl: null, backdropUrl: null };
  }

  const variants = getSearchVariants(query);
  const yearParam = year && /^\d{4}$/.test(year.trim()) ? `&year=${year.trim()}` : "";

  for (const v of variants) {
    // 1. Thử search/multi trước (hỗ trợ cả movie và tv series, anime)
    try {
      const urlMulti = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(v)}${yearParam}`;
      const res = await fetch(urlMulti, {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const first = data.results?.find((item: { poster_path?: string; backdrop_path?: string }) => item?.poster_path || item?.backdrop_path) || data.results?.[0];
        if (first?.poster_path || first?.backdrop_path) {
          return {
            posterUrl: first.poster_path ? `https://image.tmdb.org/t/p/w500${first.poster_path}` : null,
            backdropUrl: first.backdrop_path ? `https://image.tmdb.org/t/p/w1280${first.backdrop_path}` : null,
          };
        }
      }
    } catch {}

    // 2. Thử search/tv riêng nếu multi chưa ra kết quả
    try {
      const urlTv = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(v)}`;
      const resTv = await fetch(urlTv, {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: "application/json" },
      });
      if (resTv.ok) {
        const dataTv = await resTv.json();
        const first = dataTv.results?.[0];
        if (first?.poster_path || first?.backdrop_path) {
          return {
            posterUrl: first.poster_path ? `https://image.tmdb.org/t/p/w500${first.poster_path}` : null,
            backdropUrl: first.backdrop_path ? `https://image.tmdb.org/t/p/w1280${first.backdrop_path}` : null,
          };
        }
      }
    } catch {}
  }

  return { posterUrl: null, backdropUrl: null };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title")?.trim() || "";
  const origin_name = searchParams.get("origin_name")?.trim() || "";
  const year = searchParams.get("year")?.trim() || "";
  const slug = searchParams.get("slug")?.trim() || "";

  if (!title && !origin_name && !slug) {
    return NextResponse.json({ status: false, error: "Missing query parameters" }, { status: 400 });
  }

  const cacheKey = `${slug || title}|${origin_name}|${year}`.toLowerCase();
  const now = Date.now();

  // 1. Kiểm tra L1 RAM cache
  const cached = posterMemoryCache.get(cacheKey);
  if (cached && cached.expireAt > now) {
    return NextResponse.json({
      status: true,
      posterUrl: cached.posterUrl,
      backdropUrl: cached.backdropUrl,
      source: "l1-cache",
    });
  }

  // 2. Kiểm tra L2 KV cache
  const kvKey = `poster:fallback:${cacheKey}`;
  const result = await cacheService.fetchOrSet(
    kvKey,
    async () => {
      // Ưu tiên tìm theo tên gốc tiếng Anh/quốc tế trước (tỷ lệ match TMDB chuẩn xác 98%)
      if (origin_name && origin_name !== title) {
        const res = await queryTmdbPoster(origin_name, year);
        if (res.posterUrl) return res;
      }

      // Thử tìm theo tên tiếng Việt
      if (title) {
        const res = await queryTmdbPoster(title, year);
        if (res.posterUrl) return res;
      }

      // Thử tìm theo slug được chuẩn hóa thành từ khóa
      if (slug) {
        const slugQuery = slug.replace(/-/g, " ");
        const res = await queryTmdbPoster(slugQuery, year);
        if (res.posterUrl) return res;
      }

      return { posterUrl: null, backdropUrl: null };
    },
    30 * 86400 // 30 ngày
  );

  // Lưu vào L1 RAM
  posterMemoryCache.set(cacheKey, {
    posterUrl: result?.posterUrl || null,
    backdropUrl: result?.backdropUrl || null,
    expireAt: now + MEMORY_TTL,
  });

  return NextResponse.json({
    status: true,
    posterUrl: result?.posterUrl || null,
    backdropUrl: result?.backdropUrl || null,
    source: "tmdb",
  });
}
