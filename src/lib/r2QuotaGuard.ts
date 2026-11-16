/**
 * CLOUDFLARE R2 QUOTA GUARD & DISTRIBUTED CIRCUIT BREAKER (REDIS DB 3 AUX)
 * 
 * Bảo vệ tối ưu hạn mức gói Free của Cloudflare R2:
 * - Hạn mức Free Cloudflare R2: 10 GB lưu trữ & 1,000,000 lượt Class A (PUT/POST)/tháng
 * - Băng thông Egress: 0đ (Hoàn toàn miễn phí, không giới hạn)
 * 
 * Ngưỡng an toàn bảo vệ:
 * - Tối đa 1,500 uploads / ngày (Tháng ~45,000 lượt -> Dưới 4.5% quota 1,000,000)
 * - Tối đa 40,000 uploads / tháng (Chỉ chiếm 4% quota 1,000,000)
 * - Tối đa 6 GB dung lượng lưu trữ (60% quota 10 GB, chừa 4 GB biên độ an toàn)
 * - Tách riêng UGC (Avatar/Cover người dùng) và Cache Poster để người dùng luôn upload được
 * - Đồng bộ phân tán qua Redis DB 3 (Aux) để mọi Vercel Serverless containers cùng nhìn thấy một con số đếm
 */

import { cacheService } from "@/lib/cache";

export interface R2QuotaMetrics {
  isCircuitBreakerTripped: boolean;
  tripReason?: string;
  dailyUploadCount: number;
  maxDailyUploads: number;
  monthlyUploadCount: number;
  maxMonthlyUploads: number;
  estimatedStorageBytes: number;
  maxStorageBytes: number;
  lastTripTimestamp?: number;
}

// Ngưỡng an toàn chuẩn hóa cho Cloudflare R2
export const R2_LIMITS = {
  MAX_DAILY_UPLOADS: 1500,
  MAX_MONTHLY_UPLOADS: 40000,
  MAX_STORAGE_BYTES: 6 * 1024 * 1024 * 1024, // 6 GB
  MAX_DAILY_UGC_UPLOADS: 1000,
};

// In-memory ledger tracking (L1 cache được đồng bộ với Redis DB 3)
let inMemoryDailyCount = 0;
let inMemoryDailyUgcCount = 0;
let inMemoryDailyDate = new Date().toISOString().slice(0, 10);
let inMemoryMonthlyCount = 0;
let inMemoryMonthlyMonth = new Date().toISOString().slice(0, 7);
let inMemoryStorageBytes = 26 * 1024 * 1024; // Khởi điểm ước tính toàn bộ assets tĩnh ~26MB
let manualCircuitBreakerLock = false;
let lastRedisSyncTimestamp = 0;

function refreshDateWindows(): void {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);

  if (inMemoryDailyDate !== today) {
    inMemoryDailyDate = today;
    inMemoryDailyCount = 0;
    inMemoryDailyUgcCount = 0;
  }
  if (inMemoryMonthlyMonth !== thisMonth) {
    inMemoryMonthlyMonth = thisMonth;
    inMemoryMonthlyCount = 0;
  }
}

/**
 * Đồng bộ dữ liệu đếm từ Redis DB 3 về RAM container (chạy mỗi 30s hoặc khi cần)
 */
export async function syncQuotaFromRedis(): Promise<void> {
  const now = Date.now();
  if (now - lastRedisSyncTimestamp < 30_000) return;
  lastRedisSyncTimestamp = now;

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);

  try {
    const [redisDaily, redisMonthly, redisUgc] = await Promise.all([
      cacheService.get<number>(`r2:quota:daily:${today}`).catch(() => null),
      cacheService.get<number>(`r2:quota:monthly:${thisMonth}`).catch(() => null),
      cacheService.get<number>(`r2:quota:ugc:${today}`).catch(() => null),
    ]);

    if (typeof redisDaily === "number" && redisDaily > inMemoryDailyCount) {
      inMemoryDailyCount = redisDaily;
    }
    if (typeof redisMonthly === "number" && redisMonthly > inMemoryMonthlyCount) {
      inMemoryMonthlyCount = redisMonthly;
    }
    if (typeof redisUgc === "number" && redisUgc > inMemoryDailyUgcCount) {
      inMemoryDailyUgcCount = redisUgc;
    }
  } catch {
    // Graceful fallback to memory counters if Redis is unreachable
  }
}

/**
 * Kiểm tra xem có được phép upload lên R2 hay không.
 * @param contentLengthBytes Dung lượng file dự kiến upload
 * @param isBatchAdmin Đặt true khi chạy script seed/pre-warm của Quản trị viên
 * @param category Phân loại: "ugc" (Avatar/Cover user) hoặc "cache" (Proxy ảnh phim) hoặc "admin"
 */
export function checkR2QuotaAllowance(
  contentLengthBytes = 50 * 1024,
  isBatchAdmin = false,
  category: "ugc" | "cache" | "admin" = "cache"
): {
  allowed: boolean;
  reason?: string;
} {
  refreshDateWindows();

  if (manualCircuitBreakerLock) {
    return {
      allowed: false,
      reason: "Manual Circuit Breaker is active (Cầu chì đang bị khóa thủ công bởi quản trị viên)",
    };
  }

  // 1. Kiểm tra trần dung lượng lưu trữ (Hard ceiling 6GB / 10GB free)
  if (inMemoryStorageBytes + contentLengthBytes > R2_LIMITS.MAX_STORAGE_BYTES) {
    console.warn(
      `[R2 CIRCUIT BREAKER] Ngắt cầu chì! Dung lượng ước tính (${(inMemoryStorageBytes / 1024 / 1024).toFixed(1)}MB) sắp chạm trần an toàn ${R2_LIMITS.MAX_STORAGE_BYTES / 1024 / 1024}MB.`
    );
    return {
      allowed: false,
      reason: "Storage safety limit reached",
    };
  }

  // 2. Đối với UGC (Avatar / Cover do người dùng đổi):
  // Luôn ưu tiên người dùng, bảo vệ bằng quota UGC riêng biệt để không bị cache ảnh phim làm ảnh hưởng
  if (category === "ugc") {
    if (inMemoryDailyUgcCount >= R2_LIMITS.MAX_DAILY_UGC_UPLOADS) {
      return {
        allowed: false,
        reason: `Daily UGC upload ceiling reached (${inMemoryDailyUgcCount}/${R2_LIMITS.MAX_DAILY_UGC_UPLOADS})`,
      };
    }
    return { allowed: true };
  }

  // 3. Đối với Cache / Batch Admin:
  if (!isBatchAdmin && inMemoryDailyCount >= R2_LIMITS.MAX_DAILY_UPLOADS) {
    console.warn(
      `[R2 CIRCUIT BREAKER] Ngắt cầu chì! Đã đạt giới hạn ${inMemoryDailyCount}/${R2_LIMITS.MAX_DAILY_UPLOADS} uploads hôm nay. Tự động chuyển sang fallback link gốc để bảo toàn quota miễn phí.`
    );
    return {
      allowed: false,
      reason: `Daily upload ceiling reached (${inMemoryDailyCount}/${R2_LIMITS.MAX_DAILY_UPLOADS})`,
    };
  }

  if (inMemoryMonthlyCount >= R2_LIMITS.MAX_MONTHLY_UPLOADS) {
    console.warn(
      `[R2 CIRCUIT BREAKER] Ngắt cầu chì! Đã đạt giới hạn tháng ${inMemoryMonthlyCount}/${R2_LIMITS.MAX_MONTHLY_UPLOADS} uploads.`
    );
    return {
      allowed: false,
      reason: `Monthly upload ceiling reached (${inMemoryMonthlyCount}/${R2_LIMITS.MAX_MONTHLY_UPLOADS})`,
    };
  }

  return { allowed: true };
}

/**
 * Ghi nhận sau khi upload thành công vào R2: Cập nhật RAM cục bộ và tăng atomic trên Redis DB 3
 */
export function recordSuccessfulR2Upload(
  bytesUploaded: number,
  category: "ugc" | "cache" | "admin" = "cache"
): void {
  refreshDateWindows();
  inMemoryDailyCount++;
  if (category === "ugc") {
    inMemoryDailyUgcCount++;
  }
  inMemoryMonthlyCount++;
  inMemoryStorageBytes += bytesUploaded;

  // Đồng bộ phân tán lên Redis DB 3 (Aux)
  const today = inMemoryDailyDate;
  const thisMonth = inMemoryMonthlyMonth;
  const SEC_PER_DAY = 86400;

  cacheService.incr(`r2:quota:daily:${today}`, SEC_PER_DAY * 2).catch(() => {});
  cacheService.incr(`r2:quota:monthly:${thisMonth}`, SEC_PER_DAY * 35).catch(() => {});
  if (category === "ugc") {
    cacheService.incr(`r2:quota:ugc:${today}`, SEC_PER_DAY * 2).catch(() => {});
  }
}

/**
 * Ghi nhận sau khi xóa file thành công khỏi R2 (giảm dung lượng lưu trữ ước tính)
 */
export function recordSuccessfulR2Delete(bytesDeleted = 50 * 1024): void {
  refreshDateWindows();
  inMemoryStorageBytes = Math.max(0, inMemoryStorageBytes - bytesDeleted);
}

/**
 * Lấy báo cáo thống kê tình trạng Quota R2 và trạng thái cầu chì hiện tại
 */
export function getR2QuotaStatus(): R2QuotaMetrics {
  refreshDateWindows();
  const allowance = checkR2QuotaAllowance(0);
  return {
    isCircuitBreakerTripped: !allowance.allowed,
    tripReason: allowance.reason,
    dailyUploadCount: inMemoryDailyCount,
    maxDailyUploads: R2_LIMITS.MAX_DAILY_UPLOADS,
    monthlyUploadCount: inMemoryMonthlyCount,
    maxMonthlyUploads: R2_LIMITS.MAX_MONTHLY_UPLOADS,
    estimatedStorageBytes: inMemoryStorageBytes,
    maxStorageBytes: R2_LIMITS.MAX_STORAGE_BYTES,
  };
}

/**
 * Quản trị viên can thiệp thủ công (Bật/tắt cầu chì khẩn cấp)
 */
export function setManualR2CircuitBreaker(locked: boolean): void {
  manualCircuitBreakerLock = locked;
}
