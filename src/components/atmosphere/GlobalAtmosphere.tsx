"use client";

import React, { useState, useEffect } from "react";
import { useTimeAtmosphere } from "@/lib/timeAtmosphere";
import { getVietnamTodayEvent } from "@/lib/vietnamCalendar";

/**
 * NANAFLIX GLOBAL EVERYDAY ATMOSPHERE
 * Lớp ambience toàn cục ở fixed background (z-0), tạo chiều sâu không gian điện ảnh.
 * Thay đổi tinh tế theo 4 Time States (Morning, Day, Golden Hour, Night).
 * Tự động nhường chỗ khi có sự kiện Lễ hội (Holiday System).
 */

export function GlobalAtmosphere() {
  const period = useTimeAtmosphere();
  const [isHoliday, setIsHoliday] = useState(false);

  useEffect(() => {
    try {
      const today = getVietnamTodayEvent();
      setIsHoliday(Boolean(today.isToday && today.event));
    } catch {
      setIsHoliday(false);
    }
  }, []);

  // Nếu đang trong ngày Lễ/Tết, nhường toàn bộ quyền hiển thị cho Holiday Atmosphere
  if (isHoliday) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      data-time-period={period}
      className="global-atmosphere fixed inset-0 pointer-events-none select-none z-0 overflow-hidden isolate"
    >
      <style>{`
        /* LỚP 1: TOP AMBIENT HORIZON */
        .global-amb-top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 65vh;
          max-height: 700px;
          pointer-events: none;
          transition: opacity 1200ms ease, background 1200ms ease;
        }

        /* LỚP 2: SECTION AMBIENT ZONES (VÙNG SÁNG MỀM GIỮA CÁC SECTION) */
        .global-amb-zone-left {
          position: absolute;
          top: 35vh;
          left: -150px;
          width: 800px;
          height: 700px;
          border-radius: 9999px;
          filter: blur(120px);
          pointer-events: none;
          opacity: 0.7;
          transition: opacity 1200ms ease, background 1200ms ease;
        }

        .global-amb-zone-right {
          position: absolute;
          top: 75vh;
          right: -150px;
          width: 850px;
          height: 750px;
          border-radius: 9999px;
          filter: blur(130px);
          pointer-events: none;
          opacity: 0.65;
          transition: opacity 1200ms ease, background 1200ms ease;
        }

        /* 1. MORNING (05:00–09:59): Ánh sáng sớm, sương mai, hổ phách + xanh lam */
        [data-time-period="morning"] .global-amb-top {
          background: radial-gradient(
            ellipse 90% 65% at 50% -10%,
            rgba(251, 191, 36, 0.08) 0%,
            rgba(125, 211, 252, 0.05) 45%,
            rgba(14, 165, 233, 0.02) 75%,
            transparent 100%
          );
        }
        [data-time-period="morning"] .global-amb-zone-left {
          background: radial-gradient(
            circle,
            rgba(253, 230, 138, 0.045) 0%,
            rgba(56, 189, 248, 0.025) 50%,
            transparent 70%
          );
        }
        [data-time-period="morning"] .global-amb-zone-right {
          background: radial-gradient(
            circle,
            rgba(186, 230, 253, 0.04) 0%,
            rgba(251, 191, 36, 0.02) 50%,
            transparent 70%
          );
        }

        /* 2. DAY (10:00–16:59): Ánh sáng tự nhiên sạch sẽ, xanh thanh khiết */
        [data-time-period="day"] .global-amb-top {
          background: radial-gradient(
            ellipse 95% 60% at 50% -12%,
            rgba(224, 242, 254, 0.07) 0%,
            rgba(147, 197, 253, 0.045) 40%,
            rgba(59, 130, 246, 0.02) 75%,
            transparent 100%
          );
        }
        [data-time-period="day"] .global-amb-zone-left {
          background: radial-gradient(
            circle,
            rgba(186, 230, 253, 0.04) 0%,
            rgba(96, 165, 250, 0.02) 50%,
            transparent 70%
          );
        }
        [data-time-period="day"] .global-amb-zone-right {
          background: radial-gradient(
            circle,
            rgba(147, 197, 253, 0.035) 0%,
            rgba(224, 242, 254, 0.02) 50%,
            transparent 70%
          );
        }

        /* 3. GOLDEN HOUR (17:00–19:59): Hoàng hôn ấm áp, vàng cam & tím hoàng hôn */
        [data-time-period="golden-hour"] .global-amb-top {
          background: radial-gradient(
            ellipse 90% 70% at 50% -10%,
            rgba(249, 115, 22, 0.10) 0%,
            rgba(245, 158, 11, 0.06) 45%,
            rgba(159, 18, 57, 0.03) 80%,
            transparent 100%
          );
        }
        [data-time-period="golden-hour"] .global-amb-zone-left {
          background: radial-gradient(
            circle,
            rgba(251, 146, 60, 0.055) 0%,
            rgba(225, 29, 72, 0.03) 50%,
            transparent 70%
          );
        }
        [data-time-period="golden-hour"] .global-amb-zone-right {
          background: radial-gradient(
            circle,
            rgba(245, 158, 11, 0.05) 0%,
            rgba(180, 83, 9, 0.025) 50%,
            transparent 70%
          );
        }

        /* 4. NIGHT (20:00–04:59): Đêm điện ảnh sâu thẳm, ánh trăng & tím chàm */
        [data-time-period="night"] .global-amb-top {
          background: radial-gradient(
            ellipse 95% 75% at 50% -12%,
            rgba(30, 58, 138, 0.11) 0%,
            rgba(79, 70, 229, 0.065) 45%,
            rgba(88, 28, 135, 0.03) 80%,
            transparent 100%
          );
        }
        [data-time-period="night"] .global-amb-zone-left {
          background: radial-gradient(
            circle,
            rgba(99, 102, 241, 0.05) 0%,
            rgba(139, 92, 246, 0.03) 50%,
            transparent 70%
          );
        }
        [data-time-period="night"] .global-amb-zone-right {
          background: radial-gradient(
            circle,
            rgba(67, 56, 202, 0.045) 0%,
            rgba(49, 46, 129, 0.03) 50%,
            transparent 70%
          );
        }
      `}</style>

      {/* LỚP VÙNG QUANG HỌC TOP & SƯỜN */}
      <div className="global-amb-top" />
      <div className="global-amb-zone-left" />
      <div className="global-amb-zone-right" />
    </div>
  );
}

export default React.memo(GlobalAtmosphere);
