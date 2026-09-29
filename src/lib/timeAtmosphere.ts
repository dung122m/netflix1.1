"use client";

import { useState, useEffect } from "react";

export type TimePeriod = "morning" | "day" | "golden-hour" | "night";

export interface TimePeriodConfig {
  id: TimePeriod;
  label: string;
  sublabel: string;
  themeColor: string;
  ambientHex: string;
}

export const TIME_PERIOD_CONFIGS: Record<TimePeriod, TimePeriodConfig> = {
  morning: {
    id: "morning",
    label: "Bình Minh",
    sublabel: "Ánh sáng sớm trong trẻo & sương mai",
    themeColor: "#F59E0B",
    ambientHex: "rgba(245, 158, 11, 0.08)",
  },
  day: {
    id: "day",
    label: "Ban Ngày",
    sublabel: "Ánh sáng tự nhiên thuần khiết",
    themeColor: "#0EA5E9",
    ambientHex: "rgba(14, 165, 233, 0.06)",
  },
  "golden-hour": {
    id: "golden-hour",
    label: "Hoàng Hôn",
    sublabel: "Ánh vàng cam điện ảnh rực rỡ",
    themeColor: "#F97316",
    ambientHex: "rgba(249, 115, 22, 0.09)",
  },
  night: {
    id: "night",
    label: "Đêm Điện Ảnh",
    sublabel: "Bầu trời đêm huyền ảo & ánh trăng",
    themeColor: "#6366F1",
    ambientHex: "rgba(99, 102, 241, 0.08)",
  },
};

/**
 * Xác định Time Period theo 4 khung giờ:
 * - Morning: 05:00–09:59 (300 đến 599 phút)
 * - Day: 10:00–16:59 (600 đến 1019 phút)
 * - Golden Hour: 17:00–19:59 (1020 đến 1199 phút)
 * - Night: 20:00–04:59 (1200 đến 1439 và 0 đến 299 phút)
 */
export function getCurrentTimePeriod(date = new Date()): TimePeriod {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  if (timeInMinutes >= 300 && timeInMinutes < 600) {
    return "morning";
  }
  if (timeInMinutes >= 600 && timeInMinutes < 1020) {
    return "day";
  }
  if (timeInMinutes >= 1020 && timeInMinutes < 1200) {
    return "golden-hour";
  }
  return "night";
}

/**
 * Tính số milliseconds còn lại cho đến mốc chuyển Time Period tiếp theo.
 * Giúp dùng 1 `setTimeout` duy nhất thay vì polling mỗi giây.
 */
export function getMsUntilNextTimePeriod(date = new Date()): number {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ms = date.getMilliseconds();
  const currentTotalMs = (hours * 3600 + minutes * 60 + seconds) * 1000 + ms;

  // Các mốc chuyển giao thực tế: 05:00 (18M ms), 10:00 (36M ms), 17:00 (61.2M ms), 20:00 (72M ms)
  const boundaries = [18000000, 36000000, 61200000, 72000000];

  for (const b of boundaries) {
    if (b > currentTotalMs) {
      return b - currentTotalMs + 1000; // Thêm 1s buffer để đảm bảo đã qua mốc mới
    }
  }

  // Nếu đã qua 20:00, mốc chuyển tiếp tiếp theo là 05:00 sáng mai (Morning)
  return 86400000 - currentTotalMs + 18000000 + 1000;
}

/**
 * Hook lắng nghe trạng thái thời gian trong ngày không dùng polling liên tục.
 * Lập lịch chuyển tiếp chính xác vào thời điểm giao thoa.
 */
export function useTimeAtmosphere(): TimePeriod {
  const [period, setPeriod] = useState<TimePeriod>(() => getCurrentTimePeriod());

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const scheduleNext = () => {
      const now = new Date();
      const current = getCurrentTimePeriod(now);
      setPeriod((prev) => (prev !== current ? current : prev));

      const delay = getMsUntilNextTimePeriod(now);
      timer = setTimeout(scheduleNext, delay);
    };

    scheduleNext();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return period;
}
