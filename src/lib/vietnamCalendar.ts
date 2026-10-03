import { VIETNAM_EVENTS, VietnamEvent } from "@/data/vietnamEvents";
import { getHistoricalEventsForDate, VietnamHistoricalEvent } from "@/data/historicalEvents";
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

        matches.push({
          id: `ev-actor-birthday-${actor.slug}`,
          title: `Sinh Nhật Diễn Viên ${actor.name} (${dayStr}/${monthStr})`,
          shortDescription: `Mừng sinh nhật ${actor.name}${age ? ` (${age} tuổi)` : ""} — chúc mừng tuổi mới và cùng khám phá các tác phẩm điện ảnh xuất sắc.`,
          bannerDescription: `Hôm nay là sinh nhật của ${actor.name} (${actor.roles || actor.country || "Diễn viên"}). ${actor.bio ? actor.bio.slice(0, 180) + "..." : "Cùng Nanaflix khám phá các tác phẩm điện ảnh và vai diễn nổi bật gắn liền với sự nghiệp của nghệ sĩ."}`,
          category: "entertainment",
          categoryLabel: "Điện ảnh & Nghệ sĩ",
          nature: "arts-culture",
          natureLabel: "Sinh nhật diễn viên",
          priority: actor.featured ? 92 : 88,
          solarDate: { month, day },
          displayDate: `${dayStr} Tháng ${monthStr}`,
          origin: `Nghệ sĩ ${actor.name} sinh ngày ${dayStr}/${monthStr}/${birthYear || ""}${actor.placeOfBirth ? ` tại ${actor.placeOfBirth}` : ""}.`,
          significance: `Tôn vinh hành trình cống hiến nghệ thuật và các vai diễn ghi dấu ấn sâu đậm trong lòng khán giả.`,
          didYouKnow: actor.bio || `Nghệ sĩ ${actor.name} là gương mặt được đông đảo khán giả mến mộ trên Nanaflix.`,
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
  const nature = event.nature;
  const category = event.category;

  if (id.startsWith("ev-actor-birthday") && event.actorSlug) {
    return {
      ...event,
      relatedLink: `/dien-vien/${event.actorSlug}`,
      relatedLabel: event.relatedLabel || `Xem phim của ${event.actorName || "diễn viên"}`,
    };
  }

  // Ngày Điện ảnh Việt Nam
  if (id.includes("dien-anh-vn") || id.includes("03-15-dien-anh")) {
    return {
      ...event,
      relatedLink: "/browse?type=phim-chieu-rap",
      relatedLabel: "Khám phá phim chiếu rạp",
    };
  }

  // Ngày Hoạt hình Thế giới
  if (id.includes("hoat-hinh") || id.includes("animation")) {
    return {
      ...event,
      relatedLink: "/browse?type=hoat-hinh",
      relatedLabel: "Xem phim hoạt hình",
    };
  }

  // Ngày Điện ảnh Thế giới / Phim kinh điển
  if (id.includes("dien-anh-the-gioi") || (nature === "arts-culture" && id.includes("dien-anh"))) {
    return {
      ...event,
      relatedLink: "/browse?sort=views",
      relatedLabel: "Khám phá phim kinh điển",
    };
  }

  // Halloween
  if (event.effect === "halloween" || id.includes("halloween")) {
    return {
      ...event,
      relatedLink: "/browse?search=kinh-di",
      relatedLabel: "Xem phim kinh dị",
    };
  }

  // Giáng Sinh
  if (event.effect === "christmas" || id.includes("giang-sinh") || id.includes("noel")) {
    return {
      ...event,
      relatedLink: "/browse?search=giáng sinh",
      relatedLabel: "Xem phim Giáng Sinh",
    };
  }

  // Tết Nguyên Đán
  if (event.effect === "tet" || id.includes("tet-nguyen-dan") || id.includes("giao-thua")) {
    return {
      ...event,
      relatedLink: "/browse?search=tết",
      relatedLabel: "Xem phim Tết sum vầy",
    };
  }

  // Mốc son lịch sử
  if (category === "vietnam-history" || nature === "historical-anniversary" || id.includes("giai-phong") || id.includes("quoc-khanh")) {
    return {
      ...event,
      relatedLink: "/browse?search=lịch sử",
      relatedLabel: "Xem phim lịch sử & tư liệu",
    };
  }

  return event;
}

/**
 * Tính điểm ưu tiên toàn diện của sự kiện:
 * 1. 🇻🇳 Ngày lễ / kỷ niệm chính thức của Việt Nam (Tier Base 4000)
 * 2. 🇻🇳 Ngày / sự kiện Việt Nam khác (ngành nghề, xã hội, sinh nhật diễn viên VN...) (Tier Base 3000)
 * 3. 🌎 Ngày quốc tế / toàn cầu (LHQ, UNESCO, WHO, toàn cầu...) (Tier Base 2000)
 * 4. Các sự kiện còn lại (đời sống, chủ đề vui, fun...) (Tier Base 1000)
 * Trong cùng phân cấp (Tier), điểm priority gốc được cộng thêm để bảo toàn tuyệt đối thứ hạng nội bộ.
 */
export function getEventPriorityScore(event: VietnamEvent): number {
  const id = event.id.toLowerCase();
  const title = event.title.toLowerCase();
  const cat = event.category;
  const nat = event.nature;

  // 1. 🇻🇳 Ngày lễ / ngày kỷ niệm chính thức của Việt Nam
  const isOfficialVnHoliday =
    cat === "national-holiday" ||
    nat === "official-holiday" ||
    cat === "vietnam-history" ||
    nat === "historical-anniversary" ||
    nat === "traditional-festival" ||
    (cat === "traditional-culture" && !nat.includes("international")) ||
    event.effect === "national-day" ||
    event.effect === "tet" ||
    event.effect === "mid-autumn";

  if (isOfficialVnHoliday) {
    return 4000 + (event.priority ?? 50);
  }

  // 2. 🇻🇳 Ngày / sự kiện Việt Nam khác (ngành nghề, xã hội, khuyến học, phụ nữ VN, doanh nhân VN, sinh nhật diễn viên VN...)
  const isVnSpecificEvent =
    id.includes("-vn") ||
    id.includes("viet-nam") ||
    id.includes("vietnam") ||
    title.includes("việt nam") ||
    title.includes("quốc gia") ||
    id.startsWith("ev-actor-birthday") ||
    (event.country && /^(?:vn|vietnam|việt nam)$/i.test(event.country)) ||
    (cat === "social-family" && nat !== "international-day" && !id.includes("the-gioi") && !id.includes("quoc-te")) ||
    (nat === "arts-culture" && !id.includes("the-gioi") && !id.includes("quoc-te"));

  if (isVnSpecificEvent) {
    return 3000 + (event.priority ?? 50);
  }

  // 3. 🌎 Ngày quốc tế / toàn cầu
  const isInternationalEvent =
    cat === "international" ||
    nat === "international-day" ||
    id.includes("the-gioi") ||
    id.includes("quoc-te") ||
    id.includes("world-") ||
    id.includes("international") ||
    /quốc tế|thế giới|toàn cầu|un|unesco|who/i.test(title);

  if (isInternationalEvent) {
    return 2000 + (event.priority ?? 50);
  }

  // 4. Các sự kiện còn lại (Chủ đề đời sống, thú vị, fun...)
  return 1000 + (event.priority ?? 50);
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
  const dayOfYear = getDayOfYear(now);

  // Check if today matches any historical milestones
  const historicalEvents = getHistoricalEventsForDate(month, day, lunar.lunarMonth, lunar.lunarDay);
  const historicalEventsToday = historicalEvents.length > 0 ? historicalEvents : undefined;

  // 1. Check if today matches any event directly
  const todayMatches: VietnamEvent[] = [];

  for (const ev of VIETNAM_EVENTS) {
    // Solar match
    if (ev.solarDate) {
      const matchMonth = ev.solarDate.month === month;
      const matchDay = ev.solarDate.endDay
        ? day >= ev.solarDate.day && day <= ev.solarDate.endDay
        : day === ev.solarDate.day;
      if (matchMonth && matchDay) {
        todayMatches.push(enrichEventWithCinemaLinks(ev));
        continue;
      }
    }

    // Lunar match
    if (ev.lunarDate) {
      if (ev.lunarDate.isNewYearEve) {
        // Giao thừa: 29 or 30 of month 12
        if (lunar.lunarMonth === 12 && (lunar.lunarDay === 29 || lunar.lunarDay === 30)) {
          todayMatches.push(enrichEventWithCinemaLinks(ev));
          continue;
        }
      } else {
        const matchLMonth = ev.lunarDate.lunarMonth === lunar.lunarMonth;
        const matchLDay = ev.lunarDate.endLunarDay
          ? lunar.lunarDay >= ev.lunarDate.lunarDay && lunar.lunarDay <= ev.lunarDate.endLunarDay
          : lunar.lunarDay === ev.lunarDate.lunarDay;
        if (matchLMonth && matchLDay) {
          todayMatches.push(enrichEventWithCinemaLinks(ev));
          continue;
        }
      }
    }

    // Custom date rules
    if (ev.dateRule === "programmer-day") {
      const targetDayOfYear = isLeapYear(year) ? 256 : 256;
      if (dayOfYear === targetDayOfYear) {
        todayMatches.push(enrichEventWithCinemaLinks(ev));
        continue;
      }
    }
  }

  // 1.1 Kiểm tra sinh nhật diễn viên từ ACTORS_CATALOG (dữ liệu thật)
  const actorBirthdays = getActorBirthdaysForDate(month, day, year);
  if (actorBirthdays.length > 0) {
    todayMatches.push(...actorBirthdays);
  }

  const solarDateFormatted = formatSolarDateVn(now);
  const lunarDateFormatted = formatLunarDateVn(lunar);

  if (todayMatches.length > 0) {
    // Ưu tiên theo thứ bậc:
    // 1. 🇻🇳 Ngày lễ/kỷ niệm chính thức của Việt Nam (Tier 4000)
    // 2. 🇻🇳 Ngày/sự kiện Việt Nam khác / Sinh nhật diễn viên VN (Tier 3000)
    // 3. 🌎 Ngày quốc tế / toàn cầu (Tier 2000)
    // 4. Các sự kiện còn lại (Tier 1000)
    const sortedMatches = [...todayMatches].sort((a, b) => {
      const scoreDiff = getEventPriorityScore(b) - getEventPriorityScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return a.id.localeCompare(b.id);
    });

    const priorityEvent = sortedMatches[0];

    return {
      event: priorityEvent,
      allEventsToday: sortedMatches,
      historicalEventsToday,
      isToday: true,
      daysUntil: 0,
      solarDateFormatted,
      lunarDateFormatted,
      badgeLabel: "ĐANG DIỄN RA",
      badgeSub: priorityEvent.displayDate,
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
    } else if (ev.dateRule === "programmer-day") {
      let candYear = year;
      const targetDay = isLeapYear(candYear) ? 12 : 13;
      let candDate = new Date(candYear, 8, targetDay); // Sept 12 or 13
      if (candDate.getTime() < todayTime) {
        candYear += 1;
        candDate = new Date(candYear, 8, isLeapYear(candYear) ? 12 : 13);
      }
      candidateSolarDate = candDate;
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
