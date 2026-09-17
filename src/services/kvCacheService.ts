/**
 * Dịch vụ Cloudflare KV Cache toàn cầu đa tầng (Multi-Tier Cache: L1 In-Memory + L2 Cloudflare KV)
 * - Tầng 1: L1 In-Memory RAM (0ms) + Single-flight Mutex chống Cache Stampede
 * - Tầng 2: L2 Cloudflare KV Edge qua Cloudflare REST API (~15ms)
 * - Tự động Fallback an toàn: Nếu Cloudflare KV offline hoặc chưa có Namespace ID, hệ thống tự động chạy trên L1 RAM
 * - 0% nguy cơ crash website, không thêm dependency ngoài.
 */

interface L1CacheEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  expireAt: number;
}

const L1_CACHE = new Map<string, L1CacheEntry>();
const MAX_L1_ENTRIES = 600;

// Single-Flight Mutex: Gom nhóm các request đồng thời cùng key, chỉ thực hiện fetcher 1 lần duy nhất
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightRequests = new Map<string, Promise<any>>();

let cachedNamespaceId: string | null | undefined = undefined;
let isWarnedUnavailable = false;

function getCloudflareCredentials() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = (process.env.CLOUDFLARE_KV_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN)?.trim();
  const explicitNamespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID?.trim();
  return { accountId, apiToken, explicitNamespaceId };
}

/**
 * Tự động tìm kiếm hoặc xác định Namespace ID
 */
async function resolveNamespaceId(): Promise<string | null> {
  if (cachedNamespaceId !== undefined) {
    return cachedNamespaceId;
  }

  const { accountId, apiToken, explicitNamespaceId } = getCloudflareCredentials();

  if (explicitNamespaceId) {
    cachedNamespaceId = explicitNamespaceId;
    return cachedNamespaceId;
  }

  if (!accountId || !apiToken) {
    if (!isWarnedUnavailable) {
      console.info("[kvCache] Cloudflare credentials missing. Running in In-Memory High Performance mode.");
      isWarnedUnavailable = true;
    }
    cachedNamespaceId = null;
    return null;
  }

  // Thử tự động tìm namespace có sẵn trên Cloudflare
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces?per_page=10`,
      {
        headers: { Authorization: `Bearer ${apiToken}`, Accept: "application/json" },
        signal: AbortSignal.timeout(3000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.result) && data.result.length > 0) {
        // Ưu tiên namespace có tên liên quan đến nanaflix / netflix / cache
        const matched = data.result.find((ns: { title?: string; id: string }) => {
          const t = (ns.title || "").toLowerCase();
          return t.includes("nanaflix") || t.includes("netflix") || t.includes("cache") || t.includes("kv");
        });
        const selectedId = matched ? matched.id : data.result[0].id;
        cachedNamespaceId = selectedId;
        console.info(`[kvCache] Connected to Cloudflare KV Namespace: ${selectedId}`);
        return selectedId;
      }
    }
  } catch {
    // Không làm gián đoạn hệ thống nếu mạng gặp sự cố
  }

  cachedNamespaceId = null;
  return null;
}

/**
 * Làm sạch và chuẩn hóa key để không bị lỗi HTTP URI
 */
function sanitizeKey(key: string): string {
  return key
    .trim()
    .replace(/[\r\n\t]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 512);
}

export const kvCache = {
  /**
   * Đọc dữ liệu từ Cache (L1 Memory trước -> L2 Cloudflare KV sau)
   */
  async get<T>(rawKey: string): Promise<T | null> {
    const key = sanitizeKey(rawKey);
    const now = Date.now();

    // 1. Kiểm tra L1 Memory Cache (0ms)
    const mem = L1_CACHE.get(key);
    if (mem) {
      if (mem.expireAt > now) {
        return mem.value as T;
      }
      L1_CACHE.delete(key);
    }

    // 2. Kiểm tra L2 Cloudflare KV
    const { accountId, apiToken } = getCloudflareCredentials();
    const namespaceId = await resolveNamespaceId();

    if (!accountId || !apiToken || !namespaceId) {
      return null;
    }

    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiToken}` },
        signal: AbortSignal.timeout(2000), // Timeout ngắn 2s để không làm nghẽn người dùng
      });

      if (res.status === 404) {
        return null;
      }

      if (res.ok) {
        const text = await res.text();
        if (!text) return null;
        try {
          const parsed = JSON.parse(text) as T;
          // Cập nhật ngược lại vào L1 Memory để các request tiếp theo lấy 0ms
          L1_CACHE.set(key, { value: parsed, expireAt: now + 5 * 60 * 1000 });
          return parsed;
        } catch {
          return text as unknown as T;
        }
      }
    } catch {
      // Fallback an toàn, không báo lỗi ra ngoài
    }

    return null;
  },

  /**
   * Lưu dữ liệu vào Cache (L1 Memory ngay lập tức, L2 Cloudflare KV bất đồng bộ)
   */
  async set<T>(rawKey: string, value: T, ttlSeconds: number = 86400): Promise<boolean> {
    if (value === undefined || value === null) return false;
    const key = sanitizeKey(rawKey);
    const now = Date.now();
    const safeTtl = Math.max(60, ttlSeconds); // Cloudflare KV yêu cầu tối thiểu 60s

    // 1. Lưu vào L1 Memory Cache
    if (L1_CACHE.size >= MAX_L1_ENTRIES) {
      const oldestKey = L1_CACHE.keys().next().value;
      if (oldestKey) L1_CACHE.delete(oldestKey);
    }
    L1_CACHE.set(key, {
      value,
      expireAt: now + Math.min(safeTtl * 1000, 30 * 60 * 1000), // L1 giữ tối đa 30 phút để giải phóng RAM
    });

    // Trích xuất thông tin hàm gọi (caller/source) phục vụ audit KV write
    const callerSource =
      new Error().stack
        ?.split("\n")
        .slice(2, 5)
        .map((s) => s.trim().replace(/^at\s+/, ""))
        .join(" -> ") || "unknown";

    // 2. Ghi bất đồng bộ vào L2 Cloudflare KV (Fire-and-forget, không block luồng trả về)
    const { accountId, apiToken } = getCloudflareCredentials();
    resolveNamespaceId().then((namespaceId) => {
      if (!accountId || !apiToken || !namespaceId) return;

      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}?expiration_ttl=${safeTtl}`;
      const payload = typeof value === "string" ? value : JSON.stringify(value);

      console.info(
        `[KV_WRITE] [${new Date().toISOString()}] key="${key}" ttl=${safeTtl}s source="${callerSource}"`
      );

      fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: payload,
        signal: AbortSignal.timeout(3500),
      }).catch(() => {
        // Bỏ qua lỗi ghi Cloudflare KV để không ảnh hưởng luồng chính
      });
    });

    return true;
  },

  /**
   * Xóa một key khỏi Cache
   */
  async delete(rawKey: string): Promise<boolean> {
    const key = sanitizeKey(rawKey);
    L1_CACHE.delete(key);

    const { accountId, apiToken } = getCloudflareCredentials();
    const namespaceId = await resolveNamespaceId();
    if (accountId && apiToken && namespaceId) {
      try {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
        await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiToken}` },
          signal: AbortSignal.timeout(2500),
        });
        return true;
      } catch {}
    }
    return false;
  },

  /**
   * MẪU SỬ DỤNG CHÍNH: Lấy dữ liệu từ cache, nếu MISS thì gọi fetcher và tự động lưu cache
   * - Hỗ trợ Single-Flight Mutex: nếu 10 request cùng gọi vào 1 key khi đang MISS, chỉ có 1 fetcher chạy!
   */
  async fetchOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 86400
  ): Promise<T> {
    // 1. Thử lấy từ cache trước
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // 2. Chống Cache Stampede: Kiểm tra nếu key này đang có 1 request khác fetch
    const sanitized = sanitizeKey(key);
    const inFlight = inFlightRequests.get(sanitized);
    if (inFlight) {
      return await inFlight;
    }

    // 3. Thực thi fetcher với Single-Flight Mutex
    const task = (async () => {
      try {
        const freshData = await fetcher();
        if (freshData !== null && freshData !== undefined) {
          await this.set(key, freshData, ttlSeconds);
        }
        return freshData;
      } finally {
        inFlightRequests.delete(sanitized);
      }
    })();

    inFlightRequests.set(sanitized, task);
    return await task;
  },

  /**
   * Xóa toàn bộ bộ nhớ đệm L1 RAM (phục vụ test, reset bộ nhớ hoặc benchmark L2 KV)
   */
  clearL1(): void {
    L1_CACHE.clear();
  },

  /**
   * Kiểm tra xem 1 key có đang nằm trong L1 RAM hay không
   */
  hasL1(rawKey: string): boolean {
    const key = sanitizeKey(rawKey);
    const entry = L1_CACHE.get(key);
    return Boolean(entry && entry.expireAt > Date.now());
  },
};
