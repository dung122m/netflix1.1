import { GoogleGenAI } from "@google/genai";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export interface SemanticMovieItem {
  id: string; // slug
  title: string;
  originalName?: string;
  posterUrl: string;
  thumbUrl?: string;
  year?: number;
  quality?: string;
  category?: string;
  description?: string;
  similarity?: number;
}

// In-memory cache for query embeddings to eliminate duplicate API calls
const queryEmbeddingCache = new Map<string, { vector: number[]; timestamp: number }>();

/**
 * Lấy danh sách tất cả các Gemini API Key để tự động xoay vòng khi hết Quota (429)
 */
function getCandidateGeminiApiKeys(customApiKey?: string): string[] {
  const envKeys = (process.env?.GEMINI_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 5);

  return Array.from(
    new Set(
      [customApiKey?.trim(), ...envKeys].filter(
        (k): k is string => Boolean(k && k.length > 5)
      )
    )
  );
}

const EMBEDDING_MODELS = ["gemini-embedding-2", "gemini-embedding-001", "text-embedding-004"];

/**
 * Tạo Vector Embedding từ Cloudflare Workers AI (@cf/baai/bge-base-en-v1.5 - 768 dimensions)
 * Miễn phí 10,000 Neurons/ngày, độ trễ Edge siêu tốc (~50ms)
 */
async function generateCloudflareEmbedding(text: string): Promise<number[] | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/baai/bge-base-en-v1.5`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: [text.slice(0, 1000)],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[aiVectorService] Cloudflare Workers AI error (${res.status}):`, errText.slice(0, 120));
      return null;
    }

    const data = await res.json();
    // Cloudflare response structure: { result: { data: [[0.12, 0.34, ...]] }, success: true }
    const vector = data?.result?.data?.[0];
    if (Array.isArray(vector) && vector.length > 0) {
      if (vector.length > 768) {
        return vector.slice(0, 768);
      }
      return vector;
    }
  } catch (err) {
    console.warn("[aiVectorService] Cloudflare Workers AI embedding skipped:", err instanceof Error ? err.message : err);
  }

  return null;
}

/**
 * Tạo Vector Embedding từ văn bản (Ưu tiên Cloudflare Workers AI -> Fallback sang Google Gemini)
 */
export async function generateGeminiEmbedding(text: string, customApiKey?: string): Promise<number[] | null> {
  const cleanText = text?.trim();
  if (!cleanText) return null;

  // 1. Kiểm tra cache (Lưu trữ 24 giờ để không gọi API trùng lặp)
  const cached = queryEmbeddingCache.get(cleanText.toLowerCase());
  if (cached && Date.now() - cached.timestamp < 86400000) {
    return cached.vector;
  }

  // 2. Thử Cloudflare Workers AI trước (10,000 requests/ngày, không lo cạn quota)
  const cfVector = await generateCloudflareEmbedding(cleanText);
  if (cfVector && cfVector.length === 768) {
    queryEmbeddingCache.set(cleanText.toLowerCase(), {
      vector: cfVector,
      timestamp: Date.now(),
    });
    return cfVector;
  }

  // 3. Fallback sang Google Gemini Embedding (Tự động xoay vòng nhiều Key)
  const candidateKeys = getCandidateGeminiApiKeys(customApiKey);
  if (candidateKeys.length === 0) {
    return null;
  }

  for (const apiKey of candidateKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey, vertexai: false });

      for (const model of EMBEDDING_MODELS) {
        try {
          const res = await Promise.race([
            ai.models.embedContent({
              model,
              contents: cleanText.slice(0, 1000),
              config: {
                outputDimensionality: 768,
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`${model} timeout 5s`)), 5000)
            ),
          ]);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let values: number[] | undefined = res.embeddings?.[0]?.values || (res as any).embedding?.values;
          if (Array.isArray(values) && values.length > 0) {
            if (values.length > 768) {
              values = values.slice(0, 768);
            }
            queryEmbeddingCache.set(cleanText.toLowerCase(), {
              vector: values,
              timestamp: Date.now(),
            });
            return values;
          }
        } catch (mErr) {
          const errMsg = mErr instanceof Error ? mErr.message : String(mErr);
          if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
            console.warn(`[aiVectorService] Key ${apiKey.slice(0, 10)}... đạt giới hạn Quota (${model}), chuyển sang Key dự phòng.`);
            break; // Chuyển ngay sang API Key kế tiếp
          }
        }
      }
    } catch {
      // Tiếp tục sang key kế tiếp
    }
  }

  return null;
}

/**
 * Tìm kiếm phim bằng Ngữ nghĩa & Cảm xúc qua Supabase pgvector RPC
 */
export async function searchMoviesBySemantic(
  queryText: string,
  limit: number = 20,
  threshold: number = 0.35,
  customApiKey?: string
): Promise<SemanticMovieItem[]> {
  if (!queryText || !queryText.trim()) return [];

  // 1. Tạo vector cho câu tìm kiếm của người dùng
  const queryVector = await generateGeminiEmbedding(queryText, customApiKey);
  const adminClient = getSupabaseAdmin();
  if (!queryVector || !adminClient) {
    return [];
  }

  try {
    // 2. Gọi hàm SQL RPC match_movies_vector trong PostgreSQL
    const { data, error } = await adminClient.rpc("match_movies_vector", {
      query_embedding: queryVector,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.warn("[aiVectorService] Lỗi gọi match_movies_vector RPC:", error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((d: Record<string, unknown>) => ({
      id: String(d.id),
      title: String(d.title || ""),
      originalName: d.original_name ? String(d.original_name) : undefined,
      posterUrl: String(d.poster_url || "/default-poster.jpg"),
      thumbUrl: d.thumb_url ? String(d.thumb_url) : undefined,
      year: Number(d.year) || undefined,
      quality: d.quality ? String(d.quality) : undefined,
      category: d.category ? String(d.category) : undefined,
      description: d.description ? String(d.description) : undefined,
      similarity: Number(d.similarity) || 0,
    }));
  } catch (err) {
    console.warn("[aiVectorService] Lỗi ngoại lệ semantic vector search:", err);
    return [];
  }
}

/**
 * Lưu trữ hoặc cập nhật Vector Embedding của một bộ phim vào Supabase
 */
export async function upsertMovieEmbedding(
  movie: {
    slug: string;
    title: string;
    originalName?: string;
    posterUrl: string;
    thumbUrl?: string;
    year?: number;
    quality?: string;
    category?: string;
    description?: string;
  },
  customApiKey?: string
): Promise<boolean> {
  const adminClient = getSupabaseAdmin();
  if (!movie.slug || !movie.title || !adminClient) return false;

  try {
    // Tạo văn bản ngữ cảnh phong phú để embedding
    const contentText = [
      `Tên phim: ${movie.title}`,
      movie.originalName ? `Tên gốc: ${movie.originalName}` : "",
      movie.category ? `Thể loại & Cảm xúc: ${movie.category}` : "",
      movie.year ? `Năm: ${movie.year}` : "",
      movie.description ? `Nội dung tóm tắt: ${movie.description.replace(/<[^>]*>?/gm, "").slice(0, 1200)}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    const vector = await generateGeminiEmbedding(contentText, customApiKey);
    if (!vector) return false;

    const payload = {
      id: movie.slug,
      title: movie.title,
      original_name: movie.originalName || null,
      poster_url: movie.posterUrl,
      thumb_url: movie.thumbUrl || null,
      year: movie.year || null,
      quality: movie.quality || null,
      category: movie.category || null,
      description: movie.description ? movie.description.slice(0, 600) : null,
      embedding: vector,
      updated_at: Date.now(),
    };

    const { error } = await adminClient.from("movie_embeddings").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("[aiVectorService] Lỗi upsert movie embedding:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[aiVectorService] Lỗi ngoại lệ upsert movie embedding:", err);
    return false;
  }
}

// Queue chống trùng lặp background worker
const embeddingQueueSet = new Set<string>();
let isWarmupRunning = false;

/**
 * Tự động nạp vector cho danh sách phim ở chế độ nền (Hoàn toàn tự động, không chặn UI)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function enqueueAutoEmbedMovies(movies: any[]): void {
  const adminClient = getSupabaseAdmin();
  if (!movies || !movies.length || !adminClient) return;

  // Chạy background không await để không làm chậm tải trang
  setTimeout(async () => {
    try {
      const candidates = movies
        .filter((m) => m && m.slug && !embeddingQueueSet.has(m.slug))
        .slice(0, 10);

      for (const m of candidates) {
        embeddingQueueSet.add(m.slug);
        await upsertMovieEmbedding({
          slug: m.slug,
          title: m.name || m.title || "",
          originalName: m.origin_name,
          posterUrl: m.poster_url || m.thumb_url || "/default-poster.jpg",
          thumbUrl: m.thumb_url,
          year: m.year,
          quality: m.quality,
          category: Array.isArray(m.category) ? m.category[0]?.name : m.category,
          description: m.content || m.description,
        });
      }
    } catch {}
  }, 100);
}

/**
 * Tự động kích hoạt nạp kho Vector lần đầu nếu Database chưa có
 */
export async function triggerAutoWarmupIfNeeded(): Promise<void> {
  const adminClient = getSupabaseAdmin();
  if (isWarmupRunning || !adminClient) return;
  isWarmupRunning = true;

  try {
    const { count } = await adminClient
      .from("movie_embeddings")
      .select("*", { count: "exact", head: true });

    if (count === 0 || count === null) {
      // Gọi fetch API phim và nạp tự động
      const { movieApi } = await import("@/services/movieApi");
      const res = await movieApi.getMovies({ page: 1, limit: 24 });
      if (res?.items && res.items.length > 0) {
        enqueueAutoEmbedMovies(res.items);
      }
    }
  } catch (e) {
    console.warn("[aiVectorService] Auto warmup check skipped:", e);
  } finally {
    isWarmupRunning = false;
  }
}

