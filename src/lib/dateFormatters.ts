/**
 * Shared date, relative time, age, and duration formatting helpers.
 */

export type RelativeTimeStyle = "compact" | "full" | "facebook";

export function formatRelativeTimeVi(
  input: Date | number | string | undefined,
  style: RelativeTimeStyle = "full",
): string {
  if (input === undefined || input === null || input === "") {
    return style === "compact" ? "" : "Vừa xong";
  }

  let timestamp: number;
  if (input instanceof Date) {
    timestamp = input.getTime();
  } else if (typeof input === "number") {
    timestamp = input;
  } else {
    timestamp = new Date(input).getTime();
  }

  if (Number.isNaN(timestamp) || timestamp <= 0) {
    return style === "compact" ? "" : "Vừa xong";
  }

  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSeconds < 60) {
    return "Vừa xong";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return style === "compact" ? `${diffMinutes} phút` : `${diffMinutes} phút trước`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return style === "compact" ? `${diffHours} giờ` : `${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    if (style === "compact") return `${diffDays} ngày`;
    if (style === "facebook" && diffDays < 7) return `${diffDays} ngày`;
    return `${diffDays} ngày trước`;
  }

  if (style === "facebook") {
    return new Date(timestamp).toLocaleDateString("vi-VN");
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return style === "compact" ? `${diffMonths} tháng` : `${diffMonths} tháng trước`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return style === "compact" ? `${diffYears} năm` : `${diffYears} năm trước`;
}

export function calculateAgeVi(birthdayStr?: string, deathdayStr?: string): string | null {
  if (!birthdayStr) return null;
  const birthDate = new Date(birthdayStr);
  if (Number.isNaN(birthDate.getTime())) return null;

  const endDate = deathdayStr ? new Date(deathdayStr) : new Date();
  if (Number.isNaN(endDate.getTime())) return null;

  let age = endDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = endDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age <= 0 || age > 120) return null;
  return deathdayStr ? `${age} tuổi (đã mất)` : `${age} tuổi`;
}

export function formatIsoDateToVn(dateStr?: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatWatchMinutesVi(minutes?: number, fullMinuteLabel = false): string {
  if (!minutes || minutes <= 0) return "0 phút";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return fullMinuteLabel ? `${mins} phút` : `${mins}m`;
}

export function formatVideoDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
