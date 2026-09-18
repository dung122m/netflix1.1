export interface SavedAiChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  provider?: string;
  movies?: Array<{
    slug: string;
    title: string;
    poster: string;
    year?: string | number;
    quality?: string;
    category?: string;
    country?: string;
    reason?: string;
    overview?: string;
    description?: string;
  }>;
}

export interface AiChatHistoryPayload {
  version: 1;
  updatedAt: number;
  messages: SavedAiChatMessage[];
}

const STORAGE_KEY = "nanaflix_ai_chat_v1";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ
const MAX_MESSAGES = 50;

/**
 * Đọc lịch sử chat AI từ localStorage.
 * Tự động kiểm tra TTL 24h và kiểm tra dữ liệu hợp lệ.
 */
export function loadAiChatHistory(): SavedAiChatMessage[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const data = JSON.parse(raw) as AiChatHistoryPayload;
    if (!data || typeof data !== "object" || data.version !== 1) {
      clearAiChatHistory();
      return [];
    }

    const now = Date.now();
    if (typeof data.updatedAt !== "number" || now - data.updatedAt > TTL_MS) {
      clearAiChatHistory();
      return [];
    }

    if (!Array.isArray(data.messages)) {
      clearAiChatHistory();
      return [];
    }

    // Giới hạn số lượng tin nhắn an toàn
    return data.messages.slice(-MAX_MESSAGES);
  } catch (err) {
    console.warn("[aiChatHistory] Lỗi đọc lịch sử chat từ localStorage:", err);
    clearAiChatHistory();
    return [];
  }
}

/**
 * Lưu lịch sử chat AI vào localStorage.
 * Chỉ lưu các trường cần thiết để render card, không lưu dữ liệu nhạy cảm.
 */
export function saveAiChatHistory(messages: SavedAiChatMessage[]): void {
  if (typeof window === "undefined") return;

  try {
    if (!messages || messages.length === 0) {
      clearAiChatHistory();
      return;
    }

    // Giữ tối đa MAX_MESSAGES gần nhất
    const trimmed = messages.slice(-MAX_MESSAGES).map((m) => {
      const cleanMsg: SavedAiChatMessage = {
        id: m.id || `msg-${Date.now()}`,
        role: m.role,
        text: m.text || "",
        time: m.time || "",
        provider: m.provider,
      };

      if (m.movies && Array.isArray(m.movies) && m.movies.length > 0) {
        cleanMsg.movies = m.movies.map((mov) => ({
          slug: mov.slug,
          title: mov.title,
          poster: mov.poster,
          year: mov.year,
          quality: mov.quality,
          category: mov.category,
          country: mov.country,
          reason: mov.reason,
          overview: mov.overview,
          description: mov.description,
        }));
      }

      return cleanMsg;
    });

    const payload: AiChatHistoryPayload = {
      version: 1,
      updatedAt: Date.now(),
      messages: trimmed,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[aiChatHistory] Lỗi ghi lịch sử chat vào localStorage:", err);
  }
}

/**
 * Xóa sạch lịch sử chat AI khỏi localStorage.
 */
export function clearAiChatHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
