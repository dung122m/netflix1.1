/**
 * CLOUDFLARE R2 QUOTA GUARD & AUTOMATIC CIRCUIT BREAKER
 * 
 * Bảo vệ tuyệt đối hạn mức gói Free của Cloudflare R2:
 * - Hạn mức Free Cloudflare R2: 10 GB lưu trữ & 1,000,000 lượt PUT/tháng
 * - Ngưỡng an toàn tối đa (Hard Ceilings):
 *   + Tối đa 150 uploads / ngày (Tháng tối đa ~4,500 lượt -> Chỉ chiếm 0.45% quota)
 *   + Tối đa 5,000 uploads / tháng (Chỉ chiếm 0.5% quota)
 *   + Tối đa 500 MB dung lượng tích lũy (Chỉ chiếm 5% quota 10 GB)
 * 
 * Cơ chế hoạt động:
 * 1. Trước mỗi lần uploadToR2, kiểm tra xem "cầu chì" có bị ngắt hay không.
 * 2. Nếu đã chạm ngưỡng ngày/tháng -> Cầu chì tự động NGẮT (Trip), từ chối upload và trả về fallback an toàn.
 * 3. Tự động phục hồi (Auto-reset) khi sang ngày mới hoặc tháng mới.
 */

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

// Ngưỡng an toàn tuyệt đối (Không bao giờ chạm đến 1% hạn mức miễn phí)
export const R2_LIMITS = {
  MAX_DAILY_UPLOADS: 150,
  MAX_MONTHLY_UPLOADS: 5000,
  MAX_STORAGE_BYTES: 500 * 1024 * 1024, // 500 MB
};

// In-memory ledger tracking (lưu trong instance serverless/container)
let inMemoryDailyCount = 0;
let inMemoryDailyDate = new Date().toISOString().slice(0, 10);
let inMemoryMonthlyCount = 0;
let inMemoryMonthlyMonth = new Date().toISOString().slice(0, 7);
let inMemoryStorageBytes = 26 * 1024 * 1024; // Khởi điểm ước tính toàn bộ assets tĩnh ~26MB
let manualCircuitBreakerLock = false;

function refreshDateWindows(): void {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);

  if (inMemoryDailyDate !== today) {
    inMemoryDailyDate = today;
    inMemoryDailyCount = 0;
  }
  if (inMemoryMonthlyMonth !== thisMonth) {
    inMemoryMonthlyMonth = thisMonth;
    inMemoryMonthlyCount = 0;
  }
}

/**
 * Kiểm tra xem có được phép upload lên R2 hay không.
 * Nếu vượt ngưỡng an toàn, cầu chì sẽ lập tức ngắt.
 * @param contentLengthBytes Dung lượng file dự kiến upload
 * @param isBatchAdmin Đặt true khi chạy script seed/pre-warm của Quản trị viên (bỏ qua trần ngày 150, vẫn tuân thủ trần dung lượng 500MB)
 */
export function checkR2QuotaAllowance(contentLengthBytes = 50 * 1024, isBatchAdmin = false): {
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

  // Đối với client runtime thông thường: Chặn cứng trần ngày 150 upload để chống spam / bot cào
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

  if (inMemoryStorageBytes + contentLengthBytes > R2_LIMITS.MAX_STORAGE_BYTES) {
    console.warn(
      `[R2 CIRCUIT BREAKER] Ngắt cầu chì! Dung lượng ước tính (${(inMemoryStorageBytes / 1024 / 1024).toFixed(1)}MB) sắp chạm trần an toàn ${R2_LIMITS.MAX_STORAGE_BYTES / 1024 / 1024}MB.`
    );
    return {
      allowed: false,
      reason: "Storage safety limit reached",
    };
  }

  return { allowed: true };
}

/**
 * Ghi nhận sau khi upload thành công vào R2
 */
export function recordSuccessfulR2Upload(bytesUploaded: number): void {
  refreshDateWindows();
  inMemoryDailyCount++;
  inMemoryMonthlyCount++;
  inMemoryStorageBytes += bytesUploaded;
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

