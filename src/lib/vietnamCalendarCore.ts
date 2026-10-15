import { VIETNAM_EVENTS } from "@/data/vietnamEvents";
import { VietnamEvent } from "@/data/events/types";
import type { VietnamHistoricalEvent } from "@/data/historicalEvents";

const { floor, sin, PI } = Math;

/**
 * Computes the Julian Day Number from Day, Month, Year
 */
export function computeJulianDayFromDate(dd: number, mm: number, yy: number): number {
  const a = floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;

  let jd =
    dd +
    floor((153 * m + 2) / 5) +
    365 * y +
    floor(y / 4) -
    floor(y / 100) +
    floor(y / 400) -
    32045;

  if (jd < 2299161) {
    jd = dd + floor((153 * m + 2) / 5) + 365 * y + floor(y / 4) - 32083;
  }

  return jd;
}

/**
 * Converts Julian Day Number to Gregorian Date (1-indexed month)
 */
export function computeDateFromJulianDay(jd: number): { day: number; month: number; year: number } {
  let a: number;
  let b: number;
  let c: number;

  if (jd > 2299160) {
    a = jd + 32044;
    b = floor((4 * a + 3) / 146097);
    c = a - floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }

  const d = floor((4 * c + 3) / 1461);
  const e = c - floor((1461 * d) / 4);
  const m = floor((5 * e + 2) / 153);
  const day = e - floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * floor(m / 10);
  const year = b * 100 + d - 4800 + floor(m / 10);

  return { day, month, year };
}

function computeNewMoon(k: number): number {
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const dr = PI / 180;

  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3;
  jd1 = jd1 + 0.00033 * sin((166.56 + 132.87 * t - 0.009173 * t2) * dr);

  const m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
  const mpr = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
  const f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;

  let c1 = (0.1734 - 0.000393 * t) * sin(m * dr) + 0.0021 * sin(2 * dr * m);
  c1 = c1 - 0.4068 * sin(mpr * dr) + 0.0161 * sin(dr * 2 * mpr);
  c1 = c1 - 0.0004 * sin(dr * 3 * mpr);
  c1 = c1 + 0.0104 * sin(dr * 2 * f) - 0.0051 * sin(dr * (m + mpr));
  c1 = c1 - 0.0074 * sin(dr * (m - mpr)) + 0.0004 * sin(dr * (2 * f + m));
  c1 = c1 - 0.0004 * sin(dr * (2 * f - m)) - 0.0006 * sin(dr * (2 * f + mpr));
  c1 = c1 + 0.001 * sin(dr * (2 * f - mpr)) + 0.0005 * sin(dr * (2 * mpr + m));

  const deltat =
    t < -11
      ? 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
      : -0.000278 + 0.000265 * t + 0.000262 * t2;

  return jd1 + c1 - deltat;
}

function computeSunLongitude(jdn: number): number {
  const t = (jdn - 2451545.0) / 36525;
  const t2 = t * t;
  const dr = PI / 180;
  const m = 357.5291 + 35999.0503 * t - 0.0001559 * t2 - 0.00000048 * t * t2;
  const l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2;

  const dl =
    (1.9146 - 0.004817 * t - 0.000014 * t2) * sin(dr * m) +
    (0.019993 - 0.000101 * t) * sin(dr * 2 * m) +
    0.00029 * sin(dr * 3 * m);

  let l = l0 + dl;
  l = l * dr;
  l = l - PI * 2 * floor(l / (PI * 2));
  return l;
}

function getSunLongitude(dayNumber: number, timeZone: number): number {
  return floor((computeSunLongitude(dayNumber - 0.5 - timeZone / 24) / PI) * 6);
}

function getNewMoonDay(k: number, timeZone: number): number {
  return floor(computeNewMoon(k) + 0.5 + timeZone / 24);
}

function getLunarMonth11(yy: number, timeZone: number): number {
  const off = computeJulianDayFromDate(31, 12, yy) - 2415021;
  const k = floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number): number {
  const k = floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export interface LunarDateResult {
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  lunarLeap: boolean;
}

/**
 * Converts Solar Date (dd, mm, yyyy) to Lunar Date in Vietnam (UTC+7)
 */
export function computeDateToLunarDate(
  dd: number,
  mm: number,
  yy: number,
  timeZone = 7
): LunarDateResult {
  const dayNumber = computeJulianDayFromDate(dd, mm, yy);
  const k = floor((dayNumber - 2415021.076998695) / 29.530588853);

  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }

  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear: number;

  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZone);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = floor((monthStart - a11) / 29);

  let lunarLeap = false;
  let lunarMonth = diff + 11;

  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }

  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }

  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }

  return { lunarDay, lunarMonth, lunarYear, lunarLeap };
}

/**
 * Converts Lunar Date to Solar Date in Vietnam (UTC+7)
 */
export function computeDateFromLunarDate(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  lunarLeap = false,
  timeZone = 7
): { day: number; month: number; year: number } | null {
  let a11: number;
  let b11: number;

  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timeZone);
    b11 = getLunarMonth11(lunarYear, timeZone);
  } else {
    a11 = getLunarMonth11(lunarYear, timeZone);
    b11 = getLunarMonth11(lunarYear + 1, timeZone);
  }

  const k = floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) off += 12;

  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;

    if (lunarLeap && lunarMonth !== leapMonth) {
      return null;
    } else if (lunarLeap || off >= leapOff) {
      off += 1;
    }
  }

  const monthStart = getNewMoonDay(k + off, timeZone);
  return computeDateFromJulianDay(monthStart + lunarDay - 1);
}

/**
 * Get current date in Vietnam (Asia/Ho_Chi_Minh timezone)
 */
export function getVietnamNow(dateOverride?: Date): Date {
  const base = dateOverride || new Date();
  const vnString = base.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  return new Date(vnString);
}

/**
 * Check if a year is leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Formats a solar date nicely in Vietnamese
 */
export function formatSolarDateVn(date: Date): string {
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dayName = days[date.getDay()];
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  return `${dayName}, ${d} Tháng ${m}, ${y}`;
}

/**
 * Formats lunar date string
 */
export function formatLunarDateVn(lunar: LunarDateResult): string {
  return `${lunar.lunarDay} Tháng ${lunar.lunarMonth} Âm lịch`;
}

export interface VietnamTodayInfo {
  event: VietnamEvent;
  allEventsToday?: VietnamEvent[];
  historicalEventsToday?: VietnamHistoricalEvent[];
  isToday: boolean;
  daysUntil: number; // 0 if today, > 0 if upcoming
  solarDateFormatted: string;
  lunarDateFormatted: string;
  badgeLabel: string;
  badgeSub: string;
  todaySolar: { day: number; month: number; year: number };
  todayLunar: LunarDateResult;
}

/**
 * Tự động liên kết sự kiện văn hóa / điện ảnh / lễ hội với bộ sưu tập phim tương ứng
 */
export function enrichEventWithCinemaLinks(event: VietnamEvent): VietnamEvent {
  if (event.relatedLink) return event;

  const id = event.id.toLowerCase();
  if (id.startsWith("ev-actor-birthday") && event.actorSlug) {
    return {
      ...event,
      relatedLink: `/dien-vien/${event.actorSlug}`,
      relatedLabel: event.relatedLabel || `Xem phim của ${event.actorName || "diễn viên"}`,
    };
  }

  return event;
}

/**
 * Trích xuất năm diễn ra sự kiện từ eventYear hoặc tiêu đề/ID
 */
export function extractEventYear(event: VietnamEvent): number | null {
  if (event.eventYear && event.eventYear > 0) return event.eventYear;
  const match = event.title.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/) || event.id.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
  if (match) {
    const y = parseInt(match[1], 10);
    if (y >= 1800 && y <= 2099) return y;
  }
  return null;
}

export function normalizeStringForComparison(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes the day of the month for the N-th occurrence of a specific day of week (0 = Sun, 1 = Mon, ..., 6 = Sat)
 */
export function getNthDayOfWeek(year: number, month: number, dayOfWeek: number, n: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow === dayOfWeek) {
      count++;
      if (count === n) return d;
    }
  }
  return 1;
}

/**
 * Computes the target solar { month, day } for dynamic/floating date rules
 */
export function computeDateRuleTarget(dateRule: string, year: number): { month: number; day: number } | null {
  switch (dateRule) {
    case "programmer-day": {
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      return { month: 9, day: isLeap ? 12 : 13 };
    }
    case "first-friday-october":
    case "world-smile-day": {
      const d = getNthDayOfWeek(year, 10, 5, 1);
      return { month: 10, day: d };
    }
    case "first-monday-october":
    case "world-habitat-day": {
      const d = getNthDayOfWeek(year, 10, 1, 1);
      return { month: 10, day: d };
    }
    case "mothers-day": {
      const d = getNthDayOfWeek(year, 5, 0, 2);
      return { month: 5, day: d };
    }
    case "fathers-day": {
      const d = getNthDayOfWeek(year, 6, 0, 3);
      return { month: 6, day: d };
    }
    case "second-saturday-september":
    case "world-first-aid-day": {
      const d = getNthDayOfWeek(year, 9, 6, 2);
      return { month: 9, day: d };
    }
    case "first-saturday-july": {
      const d = getNthDayOfWeek(year, 7, 6, 1);
      return { month: 7, day: d };
    }
    case "third-sunday-november": {
      const d = getNthDayOfWeek(year, 11, 0, 3);
      return { month: 11, day: d };
    }
    case "last-day-february": {
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      return { month: 2, day: isLeap ? 29 : 28 };
    }
    default:
      return null;
  }
}

/**
 * Calculates priority score strictly enforcing the Nanaflix hierarchy for cultural holidays
 */
export function getEventPriorityScore(event: VietnamEvent, currentYear: number = 2026): number {
  const normTitle = normalizeStringForComparison(event.title);
  const normId = normalizeStringForComparison(event.id);
  const cat = event.category;
  const nat = event.nature;
  const rawPriority = event.priority ?? 50;

  let anniversaryBonus = 0;
  const eventYear = extractEventYear(event);
  if (eventYear && eventYear < currentYear) {
    const anniversaryYears = currentYear - eventYear;
    if (anniversaryYears > 0) {
      if (anniversaryYears % 50 === 0 || anniversaryYears % 100 === 0) {
        anniversaryBonus += 8;
      } else if (anniversaryYears % 10 === 0) {
        anniversaryBonus += 5;
      } else if (anniversaryYears % 5 === 0) {
        anniversaryBonus += 3;
      }
    }
  }

  const isActorEvent = Boolean(event.actorSlug) || normId.startsWith("ev actor birthday");
  const isRawHistoricalEvent =
    Boolean((event as { isHistoricalOnly?: boolean }).isHistoricalOnly) ||
    (Boolean(event.historicalEventId) && normId.startsWith("hist repo"));

  if (!isActorEvent && !isRawHistoricalEvent) {
    const isMajorNationalHoliday =
      cat === "national-holiday" ||
      nat === "official-holiday" ||
      event.effect === "national-day" ||
      event.effect === "tet" ||
      event.effect === "mid-autumn" ||
      event.effect === "christmas" ||
      event.effect === "nana-birthday" ||
      normId.includes("quoc khanh") ||
      normId.includes("gio to") ||
      normId.includes("thong nhat") ||
      normId.includes("giai phong mien nam") ||
      normId.includes("giai phong thu do") ||
      normTitle.includes("giai phong thu do") ||
      normId.includes("dien bien phu") ||
      normTitle.includes("dien bien phu");

    if (isMajorNationalHoliday) {
      return 80000 + rawPriority * 10 + anniversaryBonus;
    }

    const isTopHistoricalFigure =
      normId.includes("vo nguyen giap") ||
      normId.includes("bac ho") ||
      normId.includes("ho chi minh") ||
      normId.includes("tran hung dao") ||
      normId.includes("quang trung") ||
      normId.includes("nguyen hue") ||
      normId.includes("le loi") ||
      normId.includes("le thai to") ||
      normId.includes("ly thuong kiet") ||
      normId.includes("hai ba trung") ||
      normTitle.includes("vo nguyen giap") ||
      normTitle.includes("ho chi minh") ||
      normTitle.includes("bac ho") ||
      normTitle.includes("tran hung dao") ||
      normTitle.includes("quang trung") ||
      normTitle.includes("nguyen hue") ||
      normTitle.includes("le loi") ||
      normTitle.includes("le thai to") ||
      normTitle.includes("ly thuong kiet") ||
      normTitle.includes("hai ba trung");

    if (isTopHistoricalFigure) {
      return 75000 + rawPriority * 10 + anniversaryBonus;
    }

    const isCinemaOrArts =
      nat === "arts-culture" ||
      cat === "entertainment" ||
      normId.includes("dien anh") ||
      normTitle.includes("dien anh") ||
      normId.includes("hoat hinh");

    if (isCinemaOrArts) {
      return 70000 + rawPriority * 10 + anniversaryBonus;
    }

    const isTraditional =
      cat === "traditional-culture" ||
      nat === "traditional-festival";

    if (isTraditional) {
      return 60000 + rawPriority * 10 + anniversaryBonus;
    }

    const isSocialOrInternational =
      nat === "international-day" ||
      nat === "social-observance" ||
      cat === "social-family" ||
      cat === "international";

    if (isSocialOrInternational && cat !== "fun") {
      return 50000 + rawPriority * 10 + anniversaryBonus;
    }

    return 40000 + rawPriority * 10 + anniversaryBonus;
  }

  if (isActorEvent) {
    return 10000 + rawPriority * 10;
  }

  return 1000 + rawPriority * 10 + anniversaryBonus;
}

/**
 * LIGHTWEIGHT CULTURAL HOLIDAY RESOLVER (0 heavy data)
 * Finds the cultural holiday for today strictly from VIETNAM_EVENTS (366 solar days + lunar holidays).
 * Used by Homepage banner, Navbar, and Mobile Menu for instantaneous loading without bundling allHistory.json or actorsCatalog.
 */
export function getVietnamHolidayToday(customDate?: Date): VietnamTodayInfo {
  const now = getVietnamNow(customDate);
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const lunar = computeDateToLunarDate(day, month, year, 7);
  const solarDateFormatted = formatSolarDateVn(now);
  const lunarDateFormatted = formatLunarDateVn(lunar);

  const holidayMatches: VietnamEvent[] = [];

  for (const ev of VIETNAM_EVENTS) {
    if (ev.solarDate) {
      const matchMonth = ev.solarDate.month === month;
      const matchDay = ev.solarDate.endDay
        ? day >= ev.solarDate.day && day <= ev.solarDate.endDay
        : day === ev.solarDate.day;
      if (matchMonth && matchDay) {
        holidayMatches.push(enrichEventWithCinemaLinks(ev));
        continue;
      }
    }

    if (ev.lunarDate) {
      if (ev.lunarDate.isNewYearEve) {
        if (lunar.lunarMonth === 12 && (lunar.lunarDay === 29 || lunar.lunarDay === 30)) {
          holidayMatches.push(enrichEventWithCinemaLinks(ev));
          continue;
        }
      } else {
        const matchLMonth = ev.lunarDate.lunarMonth === lunar.lunarMonth;
        const matchLDay = ev.lunarDate.endLunarDay
          ? lunar.lunarDay >= ev.lunarDate.lunarDay && lunar.lunarDay <= ev.lunarDate.endLunarDay
          : lunar.lunarDay === ev.lunarDate.lunarDay;
        if (matchLMonth && matchLDay) {
          holidayMatches.push(enrichEventWithCinemaLinks(ev));
          continue;
        }
      }
    }

    if (ev.dateRule) {
      const target = computeDateRuleTarget(ev.dateRule, year);
      if (target && target.month === month && target.day === day) {
        holidayMatches.push(enrichEventWithCinemaLinks(ev));
        continue;
      }
    }
  }

  // Sort today's holiday matches by priority score
  if (holidayMatches.length > 0) {
    holidayMatches.sort((a, b) => getEventPriorityScore(b, year) - getEventPriorityScore(a, year));
    const topHoliday = holidayMatches[0];

    return {
      event: topHoliday,
      allEventsToday: holidayMatches,
      isToday: true,
      daysUntil: 0,
      solarDateFormatted,
      lunarDateFormatted,
      badgeLabel: "ĐANG DIỄN RA",
      badgeSub: topHoliday.displayDate,
      todaySolar: { day, month, year },
      todayLunar: lunar,
    };
  }

  // Nearest upcoming event from VIETNAM_EVENTS
  const todayTime = new Date(year, month - 1, day).getTime();
  let nearestEvent: VietnamEvent = VIETNAM_EVENTS[0];
  let minDaysUntil = 9999;

  for (const ev of VIETNAM_EVENTS) {
    let candidateSolarDate: Date | null = null;

    if (ev.solarDate) {
      let candYear = year;
      let candDate = new Date(candYear, ev.solarDate.month - 1, ev.solarDate.day);
      if (candDate.getTime() < todayTime) {
        candYear += 1;
        candDate = new Date(candYear, ev.solarDate.month - 1, ev.solarDate.day);
      }
      candidateSolarDate = candDate;
    } else if (ev.lunarDate) {
      let candLunarYear = lunar.lunarYear;
      const targetSolar = computeDateFromLunarDate(
        ev.lunarDate.lunarDay,
        ev.lunarDate.lunarMonth,
        candLunarYear,
        false
      );

      if (targetSolar) {
        let candDate = new Date(targetSolar.year, targetSolar.month - 1, targetSolar.day);
        if (candDate.getTime() < todayTime) {
          candLunarYear += 1;
          const nextSolar = computeDateFromLunarDate(
            ev.lunarDate.lunarDay,
            ev.lunarDate.lunarMonth,
            candLunarYear,
            false
          );
          if (nextSolar) {
            candDate = new Date(nextSolar.year, nextSolar.month - 1, nextSolar.day);
          }
        }
        candidateSolarDate = candDate;
      }
    } else if (ev.dateRule) {
      let candYear = year;
      const target = computeDateRuleTarget(ev.dateRule, candYear);
      if (target) {
        let candDate = new Date(candYear, target.month - 1, target.day);
        if (candDate.getTime() < todayTime) {
          candYear += 1;
          const nextTarget = computeDateRuleTarget(ev.dateRule, candYear);
          if (nextTarget) {
            candDate = new Date(candYear, nextTarget.month - 1, nextTarget.day);
          }
        }
        candidateSolarDate = candDate;
      }
    }

    if (candidateSolarDate) {
      const diffMs = candidateSolarDate.getTime() - todayTime;
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        if (diffDays < minDaysUntil) {
          minDaysUntil = diffDays;
          nearestEvent = ev;
        } else if (diffDays === minDaysUntil) {
          if (getEventPriorityScore(ev) > getEventPriorityScore(nearestEvent)) {
            nearestEvent = ev;
          }
        }
      }
    }
  }

  const badgeSubText =
    minDaysUntil === 1
      ? "NGÀY MAI"
      : minDaysUntil <= 7
      ? `CÒN ${minDaysUntil} NGÀY`
      : nearestEvent.displayDate;

  return {
    event: nearestEvent,
    allEventsToday: [nearestEvent],
    isToday: false,
    daysUntil: minDaysUntil,
    solarDateFormatted,
    lunarDateFormatted,
    badgeLabel: "SẮP DIỄN RA",
    badgeSub: badgeSubText,
    todaySolar: { day, month, year },
    todayLunar: lunar,
  };
}
