import { VIETNAM_EVENTS, VietnamEvent } from "@/data/vietnamEvents";
import { getHistoricalEventsForDate, VietnamHistoricalEvent } from "@/data/historicalEvents";
import { FEATURED_HISTORICAL_EVENTS } from "@/data/history/featuredHistory";
import { CURATED_NANAFLIX_MILESTONES } from "@/data/history/curatedSeed";
import { ACTORS_CATALOG } from "@/data/actorsCatalog";

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
 * Day of the year (1 - 366)
 */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
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
 * Tìm các diễn viên có ngày sinh nhật trùng với ngày được chọn (dữ liệu xác thực từ ACTORS_CATALOG)
 */
export function getActorBirthdaysForDate(month: number, day: number, currentYear: number): VietnamEvent[] {
  const matches: VietnamEvent[] = [];
  const dayStr = String(day).padStart(2, "0");
  const monthStr = String(month).padStart(2, "0");

  for (const actor of ACTORS_CATALOG) {
    if (!actor.birthday) continue;
    const parts = actor.birthday.split("-");
    if (parts.length >= 3) {
      const bMonth = parseInt(parts[1], 10);
      const bDay = parseInt(parts[2], 10);
      if (bMonth === month && bDay === day) {
        const birthYear = parseInt(parts[0], 10);
        const age = !isNaN(birthYear) && currentYear > birthYear ? currentYear - birthYear : undefined;

        // Tinh chỉnh tóm tắt tiểu sử súc tích, loại bỏ ngoặc rườm rà
        const rawFirstParagraph = actor.bio ? actor.bio.split("\n")[0] : "";
        const cleanBioSummary = rawFirstParagraph
          ? rawFirstParagraph.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim()
          : `Nghệ sĩ ${actor.name} là gương mặt được đông đảo khán giả mến mộ trên Nanaflix.`;

        matches.push({
          id: `ev-actor-birthday-${actor.slug}`,
          title: `Sinh Nhật Diễn Viên ${actor.name} (${dayStr}/${monthStr})`,
          shortDescription: `Mừng sinh nhật ${actor.name}${age ? ` (${age} tuổi)` : ""} — cùng thưởng thức các tác phẩm nổi bật của nghệ sĩ trên Nanaflix.`,
          bannerDescription: `Hôm nay là sinh nhật của ${actor.name} (${actor.roles || actor.country || "Diễn viên"}). Cùng Nanaflix khám phá các tác phẩm điện ảnh và vai diễn nổi bật gắn liền với sự nghiệp của nghệ sĩ.`,
          category: "entertainment",
          categoryLabel: "Điện ảnh & Nghệ sĩ",
          nature: "arts-culture",
          natureLabel: "Sinh nhật diễn viên",
          priority: actor.featured ? 92 : 88,
          solarDate: { month, day },
          displayDate: `${dayStr} Tháng ${monthStr}`,
          origin: `Nghệ sĩ ${actor.name} sinh ngày ${dayStr}/${monthStr}/${birthYear || ""}${actor.placeOfBirth ? ` tại ${actor.placeOfBirth}` : ""}.`,
          significance: `Tôn vinh hành trình cống hiến nghệ thuật và các vai diễn ghi dấu ấn sâu đậm trong lòng khán giả.`,
          didYouKnow: cleanBioSummary,
          milestones: [
            `Mừng sinh nhật tuổi mới của ${actor.name}`,
            `Khám phá toàn bộ danh sách phim của ${actor.name} trên Nanaflix`,
          ],
          imageUrl: actor.avatarUrl || null,
          accentGradient: "from-purple-600/30 via-pink-600/20 to-zinc-950",
          quote: `“Chúc mừng sinh nhật ${actor.name}! Chúc nghệ sĩ luôn thăng hoa cùng nghệ thuật và mang đến nhiều vai diễn xuất sắc.”`,
          message: `Chúc ${actor.name} luôn ngập tràn nhiệt huyết sáng tạo và thành công rực rỡ trên con đường nghệ thuật.`,
          tag: "Điện ảnh",
          relatedLink: `/dien-vien/${actor.slug}`,
          relatedLabel: `Xem phim của ${actor.name}`,
          actorSlug: actor.slug,
          actorName: actor.name,
        });
      }
    }
  }

  return matches;
}

/**
 * Tự động liên kết sự kiện văn hóa / điện ảnh / lễ hội với bộ sưu tập phim tương ứng
 */
export function enrichEventWithCinemaLinks(event: VietnamEvent): VietnamEvent {
  if (event.relatedLink) return event;

  const id = event.id.toLowerCase();

  // Chỉ liên kết trực tiếp tới trang diễn viên khi là sinh nhật diễn viên
  if (id.startsWith("ev-actor-birthday") && event.actorSlug) {
    return {
      ...event,
      relatedLink: `/dien-vien/${event.actorSlug}`,
      relatedLabel: event.relatedLabel || `Xem phim của ${event.actorName || "diễn viên"}`,
    };
  }

  // Không tự động gắn link tìm kiếm từ khóa /browse?search=... hoặc /browse?category=...
  // để tránh kết quả tìm kiếm không chính xác trên trang duyệt phim.
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
 * Evaluates whether an actor birthday event qualifies as a "Featured Person" (Hero candidate).
 * Strict criteria:
 * 1. Actor must exist in ACTORS_CATALOG
 * 2. Actor must be marked as featured (actor.featured === true) or have high priority (>= 90)
 * 3. Complete and valid data: non-empty name, valid non-placeholder avatarUrl, valid slug
 */
export function isFeaturedActor(event: VietnamEvent): boolean {
  if (!event) return false;
  const isActorEvent = Boolean(event.actorSlug) || event.id.startsWith("ev-actor-birthday");
  if (!isActorEvent) return false;

  const slug = event.actorSlug || event.id.replace("ev-actor-birthday-", "");
  const actor = ACTORS_CATALOG.find((a) => a.slug === slug);
  if (!actor) return false;

  // Complete data check
  const hasValidName = Boolean(actor.name && actor.name.trim().length > 0);
  const hasValidAvatar = Boolean(
    actor.avatarUrl &&
      typeof actor.avatarUrl === "string" &&
      actor.avatarUrl.trim().length > 5 &&
      !actor.avatarUrl.includes("placeholder")
  );
  const hasValidSlug = Boolean(actor.slug && actor.slug.trim().length > 0);

  if (!hasValidName || !hasValidAvatar || !hasValidSlug) {
    return false;
  }

  return Boolean(actor.featured) || (event.priority !== undefined && event.priority >= 90);
}

/**
 * Strict Quality Gate & Eligibility Checker for Historical Events.
 * Disqualifies Tier 7 chronicle/routine/administrative records from Hero Banner.
 */
export function isHeroEligibleHistoricalEvent(
  hist: VietnamHistoricalEvent | VietnamEvent
): boolean {
  if (!hist || !hist.title) return false;

  const rawTitle = (hist.title || "").trim();
  const rawSummary = (
    ("summary" in hist && hist.summary ? hist.summary : "") ||
    ("shortDescription" in hist && hist.shortDescription ? hist.shortDescription : "") ||
    ""
  ).trim();

  // 1. DISQUALIFICATION FILTER (Immediate rejection of Tier 7 / Administrative / Routine Chronicle)
  // Check for routine administrative meeting, circular, telegram, committee, or status report keywords
  const isRoutineAdministrative =
    /\b(họp\s*\(?đợt|họp\s+bàn|họp\s+thường\s+kỳ|hội\s+nghị|ban\s+thường\s+vụ|chấp\s+hành\s+trung\s+ương\s+họp|chỉ\s+thị\s+số|chỉ\s+thị\s+\d+|nghị\s+quyết\s+số|nghị\s+quyết\s+\d+|công\s+điện|gửi\s+điện\s+cho|điện\s+mật|ký\s+lệnh|ban\s+hành\s+nghị\s+quyết|ban\s+hành\s+chỉ\s+thị|thông\s+tư|tiểu\s+ban|thành\s+lập\s+chi\s+bộ|tính\s+đến\s+thời\s+điểm\s+này|báo\s+cáo\s+sơ\s+kết|tổng\s+kết|kinh\s+tế\s+trang\s+trại|cải\s+cách\s+tư\s+pháp|cải\s+cách\s+giáo\s+dục)\b/i.test(
      rawTitle
    ) ||
    /\b(tính\s+đến\s+thời\s+điểm\s+này|thành\s+lập\s+tiểu\s+ban|báo\s+cáo\s+sơ\s+kết)\b/i.test(
      rawSummary
    );

  if (isRoutineAdministrative) {
    return false;
  }

  // Raw crawl title that ends with truncated ellipsis "..." without curated override is disqualified from Hero
  if (rawTitle.endsWith("...") || rawTitle.endsWith("…")) {
    const curatedExact = CURATED_NANAFLIX_MILESTONES.find(
      (c) => c.id === hist.id || ("historicalEventId" in hist && c.id === hist.historicalEventId)
    );
    if (!curatedExact) {
      return false;
    }
  }

  // 2. POSITIVE ELIGIBILITY CRITERIA (Must meet at least ONE with exact date/identity match)
  const normId = normalizeStringForComparison(hist.id);
  const normTitle = normalizeStringForComparison(rawTitle);
  const solarM = hist.solarDate?.month;
  const solarD = hist.solarDate?.day;

  // 2.1 Match Curated Nanaflix Milestones (CURATED_NANAFLIX_MILESTONES) with EXACT ID or EXACT DATE
  const curatedMatch = CURATED_NANAFLIX_MILESTONES.find((f) => {
    if (f.id === hist.id || ("historicalEventId" in hist && f.id === hist.historicalEventId)) {
      return true;
    }
    // Strict Date match + Token similarity (prevents cross-date bleeding)
    if (solarM && solarD && f.date?.month === solarM && f.date?.day === solarD) {
      const fNormTitle = normalizeStringForComparison(f.title);
      return (
        normTitle.includes(fNormTitle.slice(0, 15)) ||
        fNormTitle.includes(normTitle.slice(0, 15))
      );
    }
    return false;
  });

  if (curatedMatch) {
    return true;
  }

  // 2.2 Match FEATURED_HISTORICAL_EVENTS with isCurated or Tier S AND exact date/ID match
  const featuredMatch = FEATURED_HISTORICAL_EVENTS.find((f) => {
    if (f.id === hist.id || ("historicalEventId" in hist && f.id === hist.historicalEventId)) {
      return f.isCurated || f.priorityTier === "S" || (f.priorityScore ?? 0) >= 95;
    }
    if (solarM && solarD && f.date?.month === solarM && f.date?.day === solarD) {
      if (f.isCurated || f.priorityTier === "S" || (f.priorityScore ?? 0) >= 95) {
        const fNormTitle = normalizeStringForComparison(f.title);
        return (
          normTitle.includes(fNormTitle.slice(0, 15)) ||
          fNormTitle.includes(normTitle.slice(0, 15))
        );
      }
    }
    return false;
  });

  if (featuredMatch) {
    return true;
  }

  // 2.3 Major Iconic National Figure Memorial on exact date (Solemn Remembrance / Birth)
  const isMajorFigure =
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
    normId.includes("ngo quyen") ||
    normId.includes("dinh bo linh") ||
    normId.includes("nguyen trai") ||
    normTitle.includes("vo nguyen giap") ||
    normTitle.includes("ho chi minh") ||
    normTitle.includes("bac ho") ||
    normTitle.includes("tran hung dao") ||
    normTitle.includes("quang trung") ||
    normTitle.includes("nguyen hue") ||
    normTitle.includes("le loi") ||
    normTitle.includes("le thai to") ||
    normTitle.includes("ly thuong kiet") ||
    normTitle.includes("hai ba trung") ||
    normTitle.includes("ngo quyen") ||
    normTitle.includes("dinh bo linh") ||
    normTitle.includes("nguyen trai");

  const isSolemnFigureAnniversary =
    normTitle.includes("tuong niem") ||
    normTitle.includes("ngay mat") ||
    normTitle.includes("tu tran") ||
    normTitle.includes("qua doi") ||
    normTitle.includes("ngay sinh") ||
    normTitle.includes("sinh nhat") ||
    normTitle.includes("sinh ra tai") ||
    normTitle.includes("dai thang") ||
    normTitle.includes("khoi nghia");

  if (isMajorFigure && isSolemnFigureAnniversary && rawTitle.length >= 10 && !rawTitle.endsWith("...")) {
    return true;
  }

  return false;
}

export function isFeaturedHistoricalEvent(hist: VietnamHistoricalEvent | VietnamEvent): boolean {
  return isHeroEligibleHistoricalEvent(hist);
}

/**
 * Checks whether an event is eligible to be promoted to Hero Banner.
 * Strict Hero Eligibility Gate:
 * - Tier 1: National Holidays (Quốc khánh, 30/4, Tết...) -> Eligible
 * - Tier 2: Top Historical Figure Memorials (Curated) -> Eligible
 * - Tier 3: Cinema, Arts, Culture & International Curated Days -> Eligible
 * - Tier 4: Featured Actor Birthdays (with valid avatar & catalog presence) -> Eligible
 * - Tier 5/6: Curated Major Historical Milestones (Tier S/A) -> Eligible
 * - Tier 7: Routine Administrative / Chronicle / Meeting records -> NEVER Eligible (False)
 */
export function isHeroEligibleEvent(
  event: VietnamEvent,
  _currentYear: number = new Date().getFullYear()
): boolean {
  if (!event) return false;

  // 1. National Holiday / Major celebration
  if (event.category === "national-holiday" || event.nature === "official-holiday") {
    return true;
  }

  // 2. Actor Birthdays: Must be featured actor with avatar & valid catalog entry
  if (event.actorSlug || event.id.startsWith("ev-actor-birthday")) {
    return isFeaturedActor(event);
  }

  // 3. Historical Events: Must satisfy strict Hero Eligibility Gate
  const isHistorical =
    event.category === "vietnam-history" ||
    event.nature === "historical-anniversary" ||
    Boolean(event.historicalEventId) ||
    event.id.startsWith("hist-");

  if (isHistorical) {
    return isHeroEligibleHistoricalEvent(event);
  }

  // 4. Cultural / Arts / International / Fun curated holidays from VIETNAM_EVENTS
  return true;
}

/**
 * Calculates priority score strictly enforcing the Nanaflix 3-tier hierarchy:
 * 
 * 1. Curated Holiday / Special Day (Base 40,000 - 80,000+)
 *    - 1.1 National Holiday / Major celebration: 80,000 + rawPriority*10 + anniversaryBonus
 *    - 1.2 Top Historical Figure Memorial (Curated/Deduplicated): 75,000 + rawPriority*10 + anniversaryBonus
 *    - 1.3 Cinema / Arts & Culture Day: 70,000 + rawPriority*10 + anniversaryBonus
 *    - 1.4 Traditional Culture / Festival: 60,000 + rawPriority*10 + anniversaryBonus
 *    - 1.5 International & Social Observance: 50,000 + rawPriority*10 + anniversaryBonus
 *    - 1.6 Life / Theme / Fun Day (e.g. World Smile Day): 40,000 + rawPriority*10 + anniversaryBonus
 * 
 * 2. Featured Actor / Person Birthday (Base 30,000)
 *    - Prominent actor with valid avatar & filmography: 30,000 + rawPriority*10
 * 
 * 3. Featured Historical Event (Base 20,000)
 *    - Major national milestone / iconic battle / Tier S/A: 20,000 + rawPriority*10 + anniversaryBonus
 * 
 * 4. Normal Actor Birthday (Base 10,000)
 *    - Regular actor birthday: 10,000 + rawPriority*10 (tabs only, not hero override)
 * 
 * 5. Historical Normal / Minor / Chronicle (Base 1,000)
 *    - Routine administrative/diplomatic records: 1,000 + rawPriority*10 + anniversaryBonus (tabs only, never hero)
 */
export function getEventPriorityScore(event: VietnamEvent, currentYear: number = 2026): number {
  const normTitle = normalizeStringForComparison(event.title);
  const normId = normalizeStringForComparison(event.id);
  const cat = event.category;
  const nat = event.nature;
  const rawPriority = event.priority ?? 50;

  // Anniversary bonus
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

  // 1. TIER 1: Curated Holiday / Special Day (From VIETNAM_EVENTS or canonical merged holiday)
  if (!isActorEvent && !isRawHistoricalEvent) {
    // 1.1 National Holiday / Major celebration
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

    // 1.2 Top Historical Figure Memorial
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

    // 1.3 Cinema / Arts & Culture Day
    const isCinemaOrArts =
      nat === "arts-culture" ||
      cat === "entertainment" ||
      normId.includes("dien anh") ||
      normTitle.includes("dien anh") ||
      normId.includes("hoat hinh");

    if (isCinemaOrArts) {
      return 70000 + rawPriority * 10 + anniversaryBonus;
    }

    // 1.4 Traditional Culture / Festival
    const isTraditional =
      cat === "traditional-culture" ||
      nat === "traditional-festival";

    if (isTraditional) {
      return 60000 + rawPriority * 10 + anniversaryBonus;
    }

    // 1.5 International & Social Observance
    const isSocialOrInternational =
      nat === "international-day" ||
      nat === "social-observance" ||
      cat === "social-family" ||
      cat === "international";

    if (isSocialOrInternational && cat !== "fun") {
      return 50000 + rawPriority * 10 + anniversaryBonus;
    }

    // 1.6 Life / Theme / Fun Day (World Smile Day, etc.)
    return 40000 + rawPriority * 10 + anniversaryBonus;
  }

  // 2. TIER 2 & 4: Actor Birthdays
  if (isActorEvent) {
    if (isFeaturedActor(event)) {
      return 30000 + rawPriority * 10;
    }
    return 10000 + rawPriority * 10;
  }

  // 3. TIER 3 & 5: Historical Events
  if (isFeaturedHistoricalEvent(event)) {
    return 20000 + rawPriority * 10 + anniversaryBonus;
  }

  // Tier 5: Historical Normal / Minor / Chronicle
  return 1000 + rawPriority * 10 + anniversaryBonus;
}

/**
 * Checks if a holiday event is an exact duplicate of a historical milestone.
 */
export function isDuplicateHistoricalEvent(
  holidayEv: VietnamEvent,
  histEv: VietnamHistoricalEvent
): boolean {
  // 1. Direct ID match
  if (holidayEv.historicalEventId === histEv.id) return true;
  const hIdNorm = holidayEv.id.toLowerCase();
  const histIdNorm = histEv.id.toLowerCase();
  if (hIdNorm.includes("vo-nguyen-giap") && histIdNorm.includes("vo-nguyen-giap")) return true;

  // 2. Figure match on same day
  const normHolidayTitle = normalizeStringForComparison(holidayEv.title);
  const normHistTitle = normalizeStringForComparison(histEv.title);

  if (histEv.figures && histEv.figures.length > 0) {
    for (const fig of histEv.figures) {
      const normFig = normalizeStringForComparison(fig);
      if (
        normFig.length >= 4 &&
        (normHolidayTitle.includes(normFig) ||
          (holidayEv.milestoneFigure &&
            normalizeStringForComparison(holidayEv.milestoneFigure).includes(normFig)))
      ) {
        const isMemorial =
          (normHolidayTitle.includes("mat") ||
            normHolidayTitle.includes("tu tran") ||
            normHolidayTitle.includes("tuong niem")) &&
          (normHistTitle.includes("mat") ||
            normHistTitle.includes("tu tran") ||
            normHistTitle.includes("tuong niem") ||
            normHistTitle.includes("qua doi"));
        const isBirth = normHolidayTitle.includes("sinh") && normHistTitle.includes("sinh");
        const isGeneralFigureMilestone =
          holidayEv.category === "vietnam-history" ||
          holidayEv.nature === "historical-anniversary";
        if (isMemorial || isBirth || isGeneralFigureMilestone) {
          return true;
        }
      }
    }
  }

  // 3. Significant token matching for historical battles/events
  const removeNoise = (s: string) =>
    s
      .replace(
        /\b(ngay|ky niem|tuong niem|le|nam|chao mung|toan dan|quoc te|the gioi)\b/g,
        ""
      )
      .replace(/\s+/g, " ")
      .trim();

  const cleanHoliday = removeNoise(normHolidayTitle);
  const cleanHist = removeNoise(normHistTitle);

  const holidayTokens = cleanHoliday.split(" ").filter((w) => w.length >= 3);
  const histTokens = cleanHist.split(" ").filter((w) => w.length >= 3);

  if (holidayTokens.length > 0 && histTokens.length > 0) {
    let matchCount = 0;
    for (const t of holidayTokens) {
      if (histTokens.includes(t)) matchCount++;
    }
    const overlapRatio = matchCount / Math.min(holidayTokens.length, histTokens.length);
    if (
      overlapRatio >= 0.6 &&
      (holidayEv.category === "vietnam-history" ||
        holidayEv.nature === "historical-anniversary")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Converts a VietnamHistoricalEvent into a canonical VietnamEvent
 */
export function convertHistoricalToVietnamEvent(
  hist: VietnamHistoricalEvent,
  matchingHoliday?: VietnamEvent
): VietnamEvent {
  const displayDate = `${String(hist.solarDate.day).padStart(2, "0")}/${String(
    hist.solarDate.month
  ).padStart(2, "0")}${hist.year ? `/${hist.year}` : ""}`;
  const milestoneFigure = hist.figures && hist.figures.length > 0 ? hist.figures[0] : null;

  // Clean trailing "..." or "…" from raw crawl titles if any
  const cleanTitle = (hist.title || "")
    .replace(/\s*\.{3,}$/, "")
    .replace(/\s*…$/, "")
    .trim();

  const isEligible = isHeroEligibleHistoricalEvent(hist);

  return {
    id: hist.id,
    title: hist.year ? `${cleanTitle} (${hist.year})` : cleanTitle,
    shortDescription: hist.summary,
    bannerDescription: hist.summary,
    description: hist.context || hist.summary,
    subtitle: hist.context || hist.significance,
    category: matchingHoliday ? matchingHoliday.category : "vietnam-history",
    categoryLabel: matchingHoliday ? matchingHoliday.categoryLabel : "Mốc son lịch sử",
    nature: matchingHoliday ? matchingHoliday.nature : "historical-anniversary",
    natureLabel: matchingHoliday ? matchingHoliday.natureLabel : "Lịch sử Việt Nam",
    priority: matchingHoliday?.priority ?? (isEligible ? 80 : 50),
    eventYear: hist.year,
    milestoneFigure,
    solarDate: {
      month: hist.solarDate.month,
      day: hist.solarDate.day,
    },
    lunarDate: hist.lunarDate
      ? {
          lunarMonth: hist.lunarDate.lunarMonth,
          lunarDay: hist.lunarDate.lunarDay,
        }
      : undefined,
    displayDate,
    origin: hist.context || hist.summary,
    significance: hist.significance,
    meaning: hist.significance,
    didYouKnow: hist.didYouKnow || matchingHoliday?.didYouKnow || "",
    milestones: hist.keyFacts || matchingHoliday?.milestones || [],
    quote: matchingHoliday?.quote || null,
    message: matchingHoliday?.message || null,
    tag: matchingHoliday?.tag || "Lịch sử & Danh nhân",
    imageUrl: hist.imageUrl || matchingHoliday?.imageUrl || null,
    imageCaption: hist.imageCaption || undefined,
    imageSource: hist.imageSource || undefined,
    accentGradient:
      matchingHoliday?.accentGradient || "from-red-900/40 via-amber-800/30 to-zinc-950",
    relatedLink: matchingHoliday?.relatedLink || null,
    relatedLabel: matchingHoliday?.relatedLabel || undefined,
    historicalEventId: hist.id,
    heroEligible: isEligible,
    ...(matchingHoliday ? {} : { isHistoricalOnly: true }),
  } as VietnamEvent;
}

/**
 * CANONICAL HISTORY BANNER PROVIDER:
 * Supplies historical events for Banner "Hôm nay có gì đặc biệt" strictly from GitHub Historical Events dataset.
 * 
 * Flow:
 * GitHub Historical Events -> Today's date (Asia/Ho_Chi_Minh) -> Banner
 * 
 * Rules:
 * 1. Timezone: Asia/Ho_Chi_Minh
 * 2. Filter: month === currentMonth && day === currentDay (or matching lunar anniversary)
 * 3. Keeps ALL historical events on the day (no loss of events, no single-event forcing).
 * 4. Fallback: If no event on this day, gracefully returns "Hôm nay chưa có sự kiện lịch sử nổi bật."
 * 5. No mixing/fuzzy matching with holiday events dataset.
 */
export function getVietnamTodayHistoryBanner(customDate?: Date): VietnamTodayInfo {
  const now = getVietnamNow(customDate);
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const lunar = computeDateToLunarDate(day, month, year, 7);
  const solarDateFormatted = formatSolarDateVn(now);
  const lunarDateFormatted = formatLunarDateVn(lunar);

  // Retrieve historical events for today strictly from canonical GitHub historical dataset
  const historicalEvents = getHistoricalEventsForDate(month, day, lunar.lunarMonth, lunar.lunarDay);

  if (historicalEvents && historicalEvents.length > 0) {
    const convertedEvents = historicalEvents
      .map((h) => convertHistoricalToVietnamEvent(h))
      .sort((a, b) => getEventPriorityScore(b, year) - getEventPriorityScore(a, year));

    return {
      event: convertedEvents[0],
      allEventsToday: convertedEvents,
      historicalEventsToday: historicalEvents,
      isToday: true,
      daysUntil: 0,
      solarDateFormatted,
      lunarDateFormatted,
      badgeLabel: "ĐANG DIỄN RA",
      badgeSub: convertedEvents[0].displayDate,
      todaySolar: { day, month, year },
      todayLunar: lunar,
    };
  }

  // Graceful fallback when today has no historical milestones in dataset
  const fallbackEvent: VietnamEvent = {
    id: `hist-fallback-${month}-${day}`,
    title: "Hôm nay chưa có sự kiện lịch sử nổi bật",
    shortDescription: "Hiện chưa có sự kiện lịch sử nổi bật được ghi nhận cho ngày này trong tư liệu lịch sử. Cùng khám phá thêm các bộ phim và tài liệu lịch sử Việt Nam trên Nanaflix.",
    bannerDescription: "Hôm nay chưa có sự kiện lịch sử nổi bật. Cùng Nanaflix đón đọc và tìm hiểu các trang sử hào hùng của dân tộc Việt Nam qua các tác phẩm điện ảnh.",
    description: "Hôm nay chưa có sự kiện lịch sử nổi bật.",
    category: "vietnam-history",
    categoryLabel: "Lịch sử Việt Nam",
    nature: "historical-anniversary",
    natureLabel: "Lịch sử",
    priority: 0,
    solarDate: { month, day },
    displayDate: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
    origin: "Tư liệu lịch sử Việt Nam",
    significance: "Dòng chảy lịch sử hào hùng dựng nước và giữ nước của dân tộc.",
    didYouKnow: "Mỗi ngày trôi qua trong lịch sử đều ghi dấu những bước chuyển mình của đất nước.",
    milestones: [],
    quote: null,
    message: null,
    tag: "Lịch sử",
    accentGradient: "from-red-950/40 via-zinc-900 to-zinc-950",
    relatedLink: null,
    historicalEventId: `hist-fallback-${month}-${day}`,
  };

  return {
    event: fallbackEvent,
    allEventsToday: [fallbackEvent],
    historicalEventsToday: [],
    isToday: true,
    daysUntil: 0,
    solarDateFormatted,
    lunarDateFormatted,
    badgeLabel: "LỊCH SỬ VIỆT NAM",
    badgeSub: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
    todaySolar: { day, month, year },
    todayLunar: lunar,
  };
}

/**
 * Merges holiday events and historical milestones with canonical deduplication
 */
export function mergeAndDeduplicateEvents(
  holidayMatches: VietnamEvent[],
  historicalEvents: VietnamHistoricalEvent[] = [],
  actorBirthdays: VietnamEvent[] = [],
  currentYear: number = new Date().getFullYear()
): VietnamEvent[] {
  const consumedHolidayIds = new Set<string>();
  const canonicalEvents: VietnamEvent[] = [];

  // 1. Process Major Historical Events independently:
  // - Only Tier S / Major national turning-point historical milestones (isFeaturedHistoricalEvent) qualify as Hero candidates
  // - Minor historical chronicles/statistical records are EXCLUDED from Hero candidates (preserved in historicalEventsToday for Popup)
  const validMajorHistories = historicalEvents.filter((h) => isFeaturedHistoricalEvent(h));

  for (const hist of validMajorHistories) {
    const matchingHoliday = holidayMatches.find(
      (h) => !consumedHolidayIds.has(h.id) && isDuplicateHistoricalEvent(h, hist)
    );
    if (matchingHoliday) {
      consumedHolidayIds.add(matchingHoliday.id);
    }
    canonicalEvents.push(convertHistoricalToVietnamEvent(hist, matchingHoliday));
  }

  // 2. Add non-duplicate holiday events (All valid curated holidays preserved!)
  const remainingHolidays = holidayMatches.filter((h) => !consumedHolidayIds.has(h.id));

  // 3. Add featured actor birthdays (All featured persons preserved!)
  const validFeaturedPersons = actorBirthdays.filter((a) => isFeaturedActor(a));

  // 4. Combine all independently evaluated Hero candidates (Holiday + Person + Major History co-exist!)
  const allCandidates = [...canonicalEvents, ...remainingHolidays, ...validFeaturedPersons];

  // 5. Sort with comprehensive priority hierarchy
  return allCandidates.sort((a, b) => {
    const scoreDiff =
      getEventPriorityScore(b, currentYear) - getEventPriorityScore(a, currentYear);
    if (scoreDiff !== 0) return scoreDiff;

    const rankCategory = (ev: VietnamEvent) => {
      if (ev.category === "national-holiday") return 6;
      if (ev.actorSlug || ev.id.startsWith("ev-actor-birthday")) return 5;
      if (ev.category === "vietnam-history") return 4;
      if (ev.nature === "arts-culture" || ev.category === "traditional-culture") return 3;
      if (ev.category === "social-family") return 2;
      if (ev.category === "international") return 1;
      return 0;
    };
    const catDiff = rankCategory(b) - rankCategory(a);
    if (catDiff !== 0) return catDiff;

    return (b.priority ?? 50) - (a.priority ?? 50) || a.id.localeCompare(b.id);
  });
}

/**
 * Resolves the primary Hero event among the independently evaluated Hero candidates:
 * Returns the highest-priority candidate from mergeAndDeduplicateEvents.
 * If no candidate is eligible (e.g. only minor history records): Returns null (Hero does not force minor history).
 */
export function resolveHeroEvent(
  holidayMatches: VietnamEvent[],
  actorBirthdays: VietnamEvent[],
  historicalEvents: VietnamHistoricalEvent[],
  currentYear: number = new Date().getFullYear()
): VietnamEvent | null {
  const candidates = mergeAndDeduplicateEvents(
    holidayMatches,
    historicalEvents,
    actorBirthdays,
    currentYear
  );
  // Ensure the chosen candidate strictly satisfies the Hero Eligibility Gate
  const eligibleHero = candidates.find((c) => isHeroEligibleEvent(c, currentYear));
  return eligibleHero || null;
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
      const d = getNthDayOfWeek(year, 10, 5, 1); // 1st Friday of October
      return { month: 10, day: d };
    }
    case "first-monday-october":
    case "world-habitat-day": {
      const d = getNthDayOfWeek(year, 10, 1, 1); // 1st Monday of October
      return { month: 10, day: d };
    }
    case "mothers-day": {
      const d = getNthDayOfWeek(year, 5, 0, 2); // 2nd Sunday of May
      return { month: 5, day: d };
    }
    case "fathers-day": {
      const d = getNthDayOfWeek(year, 6, 0, 3); // 3rd Sunday of June
      return { month: 6, day: d };
    }
    case "second-saturday-september":
    case "world-first-aid-day": {
      const d = getNthDayOfWeek(year, 9, 6, 2); // 2nd Saturday of September
      return { month: 9, day: d };
    }
    case "first-saturday-july": {
      const d = getNthDayOfWeek(year, 7, 6, 1); // 1st Saturday of July
      return { month: 7, day: d };
    }
    case "third-sunday-november": {
      const d = getNthDayOfWeek(year, 11, 0, 3); // 3rd Sunday of November
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
 * Main helper: Finds the event for today, or finds the nearest upcoming event
 */
export function getVietnamTodayEvent(customDate?: Date): VietnamTodayInfo {
  const now = getVietnamNow(customDate);
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const lunar = computeDateToLunarDate(day, month, year, 7);

  // Check if today matches any historical milestones
  const historicalEvents = getHistoricalEventsForDate(month, day, lunar.lunarMonth, lunar.lunarDay);
  const historicalEventsToday = historicalEvents.length > 0 ? historicalEvents : undefined;

  // 1. Check if today matches any event directly from VIETNAM_EVENTS
  const holidayMatches: VietnamEvent[] = [];

  for (const ev of VIETNAM_EVENTS) {
    // Solar match
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

    // Lunar match
    if (ev.lunarDate) {
      if (ev.lunarDate.isNewYearEve) {
        // Giao thừa: 29 or 30 of month 12
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

    // Custom dynamic date rules
    if (ev.dateRule) {
      const target = computeDateRuleTarget(ev.dateRule, year);
      if (target && target.month === month && target.day === day) {
        holidayMatches.push(enrichEventWithCinemaLinks(ev));
        continue;
      }
    }
  }

  // 1.1 Kiểm tra sinh nhật diễn viên từ ACTORS_CATALOG (dữ liệu thật)
  const actorBirthdays = getActorBirthdaysForDate(month, day, year);

  // 1.2 Deduplicate and merge EVENTS + HISTORY with canonical deduplication
  const mergedTodayEvents = mergeAndDeduplicateEvents(
    holidayMatches,
    historicalEvents,
    actorBirthdays,
    year
  );

  const solarDateFormatted = formatSolarDateVn(now);
  const lunarDateFormatted = formatLunarDateVn(lunar);

  // 1.3 Resolve primary Hero candidate
  const heroCandidate = resolveHeroEvent(holidayMatches, actorBirthdays, historicalEvents, year);

  if (heroCandidate) {
    return {
      event: heroCandidate,
      allEventsToday: mergedTodayEvents,
      historicalEventsToday,
      isToday: true,
      daysUntil: 0,
      solarDateFormatted,
      lunarDateFormatted,
      badgeLabel: "ĐANG DIỄN RA",
      badgeSub: heroCandidate.displayDate,
      todaySolar: { day, month, year },
      todayLunar: lunar,
    };
  }

  // 2. If no event today, find the nearest upcoming event
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
    historicalEventsToday,
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
