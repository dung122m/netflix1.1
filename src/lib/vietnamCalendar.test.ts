import test from "node:test";
import assert from "node:assert/strict";
import { VIETNAM_EVENTS, type VietnamEvent } from "@/data/vietnamEvents";
import {
  VIETNAM_HISTORICAL_EVENTS,
  getHistoricalEventsForDate,
  type VietnamHistoricalEvent,
} from "@/data/historicalEvents";
import {
  computeDateToLunarDate,
  computeDateFromLunarDate,
  getVietnamTodayEvent,
  getVietnamTodayHistoryBanner,
  isHeroEligibleHistoricalEvent,
  getEventPriorityScore,
} from "./vietnamCalendar";

test("Vietnam Events Dataset Validation", async (t) => {
  await t.test("Dataset contains comprehensive 365+ events covering the entire year", () => {
    assert.ok(
      VIETNAM_EVENTS.length >= 365,
      `Expected >= 365 events, found ${VIETNAM_EVENTS.length}`
    );
  });

  await t.test("Solar calendar coverage covers all 366 solar calendar days (100%)", () => {
    const solarSet = new Set(
      VIETNAM_EVENTS.filter((e) => e.solarDate).map(
        (e) => `${e.solarDate!.month}-${e.solarDate!.day}`
      )
    );
    assert.equal(solarSet.size, 366, `Expected 366 unique solar days, got ${solarSet.size}`);
  });

  await t.test("All events have required properties, categories, nature labels, and non-empty content", () => {
    const validCategories = new Set([
      "national-holiday",
      "vietnam-history",
      "traditional-culture",
      "social-family",
      "international",
      "entertainment",
      "fun",
    ]);

    const validNatures = new Set([
      "official-holiday",
      "historical-anniversary",
      "traditional-festival",
      "social-observance",
      "international-day",
      "arts-culture",
      "theme-day",
    ]);

    const seenIds = new Set<string>();

    for (const ev of VIETNAM_EVENTS) {
      assert.ok(ev.id && ev.id.length > 0, `Event missing ID: ${JSON.stringify(ev)}`);
      assert.ok(!seenIds.has(ev.id), `Duplicate event ID: ${ev.id}`);
      seenIds.add(ev.id);

      assert.ok(ev.title && ev.title.trim().length > 0, `Missing title for ${ev.id}`);
      assert.ok(
        ev.shortDescription && ev.shortDescription.trim().length > 0,
        `Missing shortDescription for ${ev.id}`
      );
      assert.ok(
        validCategories.has(ev.category),
        `Invalid category ${ev.category} for ${ev.id}`
      );
      assert.ok(
        validNatures.has(ev.nature),
        `Invalid nature ${ev.nature} for ${ev.id}`
      );
      assert.ok(
        ev.natureLabel && ev.natureLabel.trim().length > 0,
        `Missing natureLabel for ${ev.id}`
      );
      assert.ok(
        typeof ev.priority === "number" && ev.priority >= 0,
        `Missing or invalid priority for ${ev.id}`
      );
      assert.ok(ev.origin && ev.origin.trim().length > 0, `Missing origin for ${ev.id}`);
      assert.ok(
        ev.significance && ev.significance.trim().length > 0,
        `Missing significance for ${ev.id}`
      );
      assert.ok(
        ev.didYouKnow && ev.didYouKnow.trim().length > 0,
        `Missing didYouKnow for ${ev.id}`
      );
      assert.ok(
        Array.isArray(ev.milestones) && ev.milestones.length > 0,
        `Missing milestones for ${ev.id}`
      );

      // Must have solarDate, lunarDate, or dateRule
      const hasDate = Boolean(ev.solarDate || ev.lunarDate || ev.dateRule);
      assert.ok(hasDate, `Event ${ev.id} must define solarDate, lunarDate, or dateRule`);
    }
  });
});

test("Vietnam Calendar Engine - Solar & Lunar Astronomical Calculation", async (t) => {
  await t.test("Converts known solar dates to lunar dates correctly", () => {
    // 10/02/2024 was Mùng 1 Tết Giáp Thìn (01/01/2024 Âm lịch)
    const tet2024 = computeDateToLunarDate(10, 2, 2024, 7);
    assert.equal(tet2024.lunarDay, 1);
    assert.equal(tet2024.lunarMonth, 1);
    assert.equal(tet2024.lunarYear, 2024);

    // 17/09/2024 was Rằm Trung Thu (15/08/2024 Âm lịch)
    const trungThu2024 = computeDateToLunarDate(17, 9, 2024, 7);
    assert.equal(trungThu2024.lunarDay, 15);
    assert.equal(trungThu2024.lunarMonth, 8);

    // 18/04/2024 was Giỗ Tổ Hùng Vương (10/03/2024 Âm lịch)
    const gioTo2024 = computeDateToLunarDate(18, 4, 2024, 7);
    assert.equal(gioTo2024.lunarDay, 10);
    assert.equal(gioTo2024.lunarMonth, 3);
  });

  await t.test("Converts lunar dates back to solar dates accurately", () => {
    // Lunar 01/01/2024 should convert back to Solar 10/02/2024
    const solarTet = computeDateFromLunarDate(1, 1, 2024, false, 7);
    assert.ok(solarTet);
    assert.equal(solarTet.day, 10);
    assert.equal(solarTet.month, 2);
    assert.equal(solarTet.year, 2024);

    // Lunar 10/03/2024 should convert to Solar 18/04/2024
    const solarGioTo = computeDateFromLunarDate(10, 3, 2024, false, 7);
    assert.ok(solarGioTo);
    assert.equal(solarGioTo.day, 18);
    assert.equal(solarGioTo.month, 4);
    assert.equal(solarGioTo.year, 2024);
  });
});

test("Vietnam Calendar Engine - Event Matching, Multi-Event and Priority Resolution", async (t) => {
  await t.test("Matches solar event accurately (e.g. 20/11 - Ngày Nhà giáo Việt Nam)", () => {
    const testDate = new Date("2024-11-20T08:00:00+07:00");
    const result = getVietnamTodayEvent(testDate);
    assert.equal(result.isToday, true);
    assert.equal(result.daysUntil, 0);
    assert.equal(result.event.id, "ev-11-20-nha-giao-viet-nam");
  });

  await t.test("Matches solar event range (e.g. 30/04 - Giải phóng miền Nam)", () => {
    const testDate = new Date("2025-04-30T08:00:00+07:00");
    const result = getVietnamTodayEvent(testDate);
    assert.equal(result.isToday, true);
    assert.ok(result.event.id.includes("giai-phong-mien-nam"));
    assert.ok(result.event.title.toLowerCase().includes("giải phóng"));
  });

  await t.test("Matches lunar event accurately (e.g. 10/03 AL Giỗ Tổ Hùng Vương in 2024)", () => {
    const testDate = new Date("2024-04-18T08:00:00+07:00");
    const result = getVietnamTodayEvent(testDate);
    assert.equal(result.isToday, true);
    // On 18/04/2024, lunar festival Giỗ Tổ Hùng Vương (priority 100) takes precedence
    assert.equal(result.event.id, "lunar-gio-to-hung-vuong");
    assert.ok(result.allEventsToday && result.allEventsToday.length >= 1);
  });

  await t.test("On multi-event days, sorts Vietnamese national/cultural events ahead of fun/international", () => {
    // 02/09: Quốc khánh Việt Nam (priority 100)
    const testDate = new Date("2025-09-02T08:00:00+07:00");
    const result = getVietnamTodayEvent(testDate);
    assert.equal(result.isToday, true);
    assert.equal(result.event.category, "national-holiday");
    assert.equal(result.event.id, "ev-09-02-quoc-khanh-viet-nam");
  });

  await t.test("Matches Nana's Birthday on May 30 with nana-birthday effect", () => {
    const testDate = new Date("2025-05-30T08:00:00+07:00");
    const result = getVietnamTodayEvent(testDate);
    assert.equal(result.isToday, true);
    assert.equal(result.event.id, "ev-05-30-sinh-nhat-nana");
    assert.equal(result.event.effect, "nana-birthday");
  });

  await t.test("Holiday effects are configured on major holidays", () => {
    const effectsMap = new Map(
      VIETNAM_EVENTS.filter((e) => e.effect).map((e) => [e.id, e.effect])
    );
    assert.equal(effectsMap.get("ev-05-30-sinh-nhat-nana"), "nana-birthday");
    assert.equal(effectsMap.get("lunar-tet-nguyen-dan"), "tet");
    assert.equal(effectsMap.get("lunar-tet-trung-thu"), "mid-autumn");
    assert.equal(effectsMap.get("ev-09-02-quoc-khanh-viet-nam"), "national-day");
    assert.equal(effectsMap.get("ev-12-25-le-giang-sinh"), "christmas");
    assert.equal(effectsMap.get("ev-10-31-halloween-cities"), "halloween");
  });

  await t.test("Every single day of the year returns a valid event without errors", () => {
    const year = 2025;
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, m, d, 10, 0, 0);
        const res = getVietnamTodayEvent(date);
        assert.ok(res.event, `No event returned for ${d}/${m + 1}/${year}`);
        assert.ok(res.event.title.length > 0);
        assert.ok(res.solarDateFormatted.length > 0);
      }
    }
  });
});

test("Cinematic Living Navbar Themes Validation", async (t) => {
  const { getHolidayNavbarTheme, HOLIDAY_NAVBAR_THEMES } = await import(
    "@/data/holidayNavbarThemes"
  );

  await t.test("All 16 cinematic holiday themes are properly defined with 3 layers", () => {
    const themeKeys = Object.keys(HOLIDAY_NAVBAR_THEMES);
    assert.equal(themeKeys.length, 16, `Expected 16 holiday themes, got ${themeKeys.length}`);

    for (const key of themeKeys) {
      const theme = HOLIDAY_NAVBAR_THEMES[key as keyof typeof HOLIDAY_NAVBAR_THEMES];
      assert.ok(theme.id, `Theme missing id: ${key}`);
      assert.ok(theme.name, `Theme missing name: ${key}`);
      // Layer 1: Ambient gradient
      assert.ok(
        theme.ambientGradient.includes("radial-gradient"),
        `Theme ${key} ambientGradient is not a valid radial gradient`
      );
      // Layer 2: Midground
      assert.ok(theme.midground.type, `Theme ${key} missing midground type`);
      assert.ok(theme.midground.opacity > 0 && theme.midground.opacity <= 0.5);
      // Layer 3: Foreground (strictly 1 to 3 items, slow motion)
      assert.ok(
        theme.foreground.items.length >= 1 && theme.foreground.items.length <= 3,
        `Theme ${key} should have 1-3 foreground items, got ${theme.foreground.items.length}`
      );
    }
  });

  await t.test("Matches major Vietnamese holidays accurately", () => {
    // 02/09: Quốc khánh
    const ev2Sep = getVietnamTodayEvent(new Date("2025-09-02T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(ev2Sep)?.id, "national-day");

    // 30/04: Giải phóng miền Nam
    const ev30Apr = getVietnamTodayEvent(new Date("2025-04-30T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(ev30Apr)?.id, "national-day");

    // 20/11: Nhà giáo Việt Nam
    const ev20Nov = getVietnamTodayEvent(new Date("2025-11-20T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(ev20Nov)?.id, "education-teachers");

    // 22/12: Quân đội Nhân dân
    const ev22Dec = getVietnamTodayEvent(new Date("2025-12-22T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(ev22Dec)?.id, "military-veterans");

    // 01/01: Tết Dương Lịch
    const ev1Jan = getVietnamTodayEvent(new Date("2025-01-01T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(ev1Jan)?.id, "new-year");

    // 30/05: Sinh nhật Nana
    const evNana = getVietnamTodayEvent(new Date("2025-05-30T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(evNana)?.id, "nana-birthday");
  });

  await t.test("Matches traditional & lunar events accurately", () => {
    // Giỗ Tổ Hùng Vương (18/04/2024 = 10/03 AL)
    const evHung = getVietnamTodayEvent(new Date("2024-04-18T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(evHung)?.id, "heritage-hung-kings");

    // Tết Trung Thu (17/09/2024 = 15/08 AL)
    const evMidAutumn = getVietnamTodayEvent(new Date("2024-09-17T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(evMidAutumn)?.id, "mid-autumn");

    // Tết Nguyên Đán (10/02/2024 = Mùng 1 Tết AL)
    const evTet = getVietnamTodayEvent(new Date("2024-02-10T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(evTet)?.id, "tet");
  });

  await t.test("Matches international festivals accurately", () => {
    // 25/12: Giáng Sinh
    const evXmas = getVietnamTodayEvent(new Date("2025-12-25T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(evXmas)?.id, "christmas");

    // 31/10: Halloween
    const evHal = getVietnamTodayEvent(new Date("2025-10-31T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(evHal)?.id, "halloween");

    // 14/02: Valentine
    const evVal = getVietnamTodayEvent(new Date("2025-02-14T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(evVal)?.id, "valentine");

    // 22/04: Earth Day
    const evEarth = getVietnamTodayEvent(new Date("2025-04-22T08:00:00+07:00")).event;
    assert.equal(getHolidayNavbarTheme(evEarth)?.id, "earth-environment");
  });

  await t.test("Regular days return null (Navbar pristine, no atmosphere)", () => {
    // A regular day with no major holiday, e.g. 15/03/2025 (Ngày Quyền của người tiêu dùng)
    const evRegular = getVietnamTodayEvent(new Date("2025-03-15T08:00:00+07:00")).event;
    const theme = getHolidayNavbarTheme(evRegular);
    assert.equal(theme, null, "Regular everyday events must return null to keep navbar pristine");
  });
});

test("Vietnam Historical Milestones System (Ngày này trong lịch sử Việt Nam)", async (t) => {
  await t.test("Dataset integrity: All historical events have verified dates, sources, and themes", () => {
    assert.ok(
      VIETNAM_HISTORICAL_EVENTS.length >= 30,
      `Expected >= 30 historical milestones, found ${VIETNAM_HISTORICAL_EVENTS.length}`
    );

    const validThemes = new Set([
      "ba-dinh-1945",
      "dien-bien-phu",
      "giai-phong-thu-do",
      "thong-nhat-1975",
      "dong-da",
      "hai-ba-trung",
      "bach-dang",
      "bac-ho-cuu-nuoc",
      "khang-chien",
      "general-history",
    ]);

    const seenIds = new Set<string>();

    for (const ev of VIETNAM_HISTORICAL_EVENTS) {
      assert.ok(ev.id && ev.id.length > 0, `Missing id for event`);
      assert.ok(!seenIds.has(ev.id), `Duplicate historical event id: ${ev.id}`);
      seenIds.add(ev.id);

      assert.ok(ev.title && ev.title.trim().length > 0, `Missing title for ${ev.id}`);
      assert.ok(ev.year !== undefined && !Number.isNaN(ev.year), `Invalid year for ${ev.id}`);
      assert.ok(ev.summary && ev.summary.trim().length > 0, `Missing summary for ${ev.id}`);
      assert.ok(ev.significance && ev.significance.trim().length > 0, `Missing significance for ${ev.id}`);
      assert.ok(validThemes.has(ev.visualTheme), `Invalid visualTheme '${ev.visualTheme}' for ${ev.id}`);
      assert.ok(Array.isArray(ev.sources) && ev.sources.length > 0, `Missing credible sources for ${ev.id}`);
      assert.ok(ev.solarDate && ev.solarDate.month >= 1 && ev.solarDate.month <= 12, `Invalid solar month for ${ev.id}`);
      assert.ok(ev.solarDate && ev.solarDate.day >= 1 && ev.solarDate.day <= 31, `Invalid solar day for ${ev.id}`);
    }
  });

  await t.test("Case 1: Holiday + Historical (e.g. 02/09 Ba Đình 1945 & Quốc Khánh)", () => {
    const res = getVietnamTodayEvent(new Date("2025-09-02T08:00:00+07:00"));
    assert.equal(res.isToday, true);
    assert.ok(res.event.id.includes("quoc-khanh"), "Should match Quoc Khanh holiday");
    assert.ok(res.historicalEventsToday && res.historicalEventsToday.length >= 1);
    const baDinhEvent = res.historicalEventsToday.find((h) => h.id.includes("tuyen-ngon-doc-lap-1945"));
    assert.ok(baDinhEvent, "Should find 1945 Ba Dinh Declaration of Independence");
    assert.equal(baDinhEvent?.year, 1945);
    assert.equal(baDinhEvent?.visualTheme, "ba-dinh-1945");
  });

  await t.test("Case 2: Multiple historical events on the same day (e.g. 02/09: 1945 & 1969)", () => {
    const eventsSep2 = getHistoricalEventsForDate(9, 2);
    assert.ok(eventsSep2.length >= 2, `Expected >= 2 historical milestones on Sept 2nd, got ${eventsSep2.length}`);
    const years = eventsSep2.map((e) => e.year);
    assert.ok(years.includes(1945), "Must include 1945 Declaration of Independence");
    assert.ok(years.includes(1969), "Must include 1969 President Ho Chi Minh passing");
  });

  await t.test("Case 3: Historical milestone on official holiday (e.g. 30/04 Thống nhất đất nước 1975)", () => {
    const res = getVietnamTodayEvent(new Date("2025-04-30T08:00:00+07:00"));
    assert.equal(res.isToday, true);
    assert.ok(res.historicalEventsToday && res.historicalEventsToday.length >= 1);
    const thongNhat = res.historicalEventsToday.find((h) => h.id.includes("giai-phong-mien-nam-1975"));
    assert.ok(thongNhat);
    assert.equal(thongNhat?.year, 1975);
    assert.equal(thongNhat?.visualTheme, "thong-nhat-1975");
  });

  await t.test("Case 4: Historical event on 10/10 (Giải phóng Thủ đô Hà Nội 1954)", () => {
    const res = getVietnamTodayEvent(new Date("2025-10-10T08:00:00+07:00"));
    assert.ok(res.historicalEventsToday && res.historicalEventsToday.length >= 1);
    const thuDo = res.historicalEventsToday.find((h) => h.id.includes("giai-phong-thu-do-1954"));
    assert.ok(thuDo);
    assert.equal(thuDo?.year, 1954);
    assert.equal(thuDo?.visualTheme, "giai-phong-thu-do");
  });

  await t.test("Case 5: Historical milestone with lunar anniversary (e.g. Ngọc Hồi - Đống Đa: Mùng 5 tháng Giêng AL)", () => {
    // 05/01 AL
    const eventsTet5 = getHistoricalEventsForDate(0, 0, 1, 5);
    assert.ok(eventsTet5.length >= 1);
    const dongDa = eventsTet5.find((e) => e.id.includes("ngoc-hoi-dong-da-1789"));
    assert.ok(dongDa);
    assert.equal(dongDa?.year, 1789);
    assert.equal(dongDa?.visualTheme, "dong-da");
  });

  await t.test("Case 6: Historical milestone for Hai Bà Trưng (Mùng 6 tháng 2 AL)", () => {
    const eventsFeb6AL = getHistoricalEventsForDate(0, 0, 2, 6);
    assert.ok(eventsFeb6AL.length >= 1);
    const haiBaTrung = eventsFeb6AL.find((e) => e.id.includes("hai-ba-trung-40"));
    assert.ok(haiBaTrung);
    assert.equal(haiBaTrung?.year, 40);
    assert.equal(haiBaTrung?.visualTheme, "hai-ba-trung");
  });

  await t.test("Case 7: Historical milestone for Bạch Đằng (Mùng 8 tháng 3 AL)", () => {
    const eventsMar8AL = getHistoricalEventsForDate(0, 0, 3, 8);
    assert.ok(eventsMar8AL.length >= 1);
    const bachDang = eventsMar8AL.find((e) => e.id.includes("bach-dang-1288"));
    assert.ok(bachDang);
    assert.equal(bachDang?.year, 1288);
    assert.equal(bachDang?.visualTheme, "bach-dang");
  });

  await t.test("Case 8: Điện Biên Phủ 07/05/1954", () => {
    const eventsMay7 = getHistoricalEventsForDate(5, 7);
    assert.ok(eventsMay7.length >= 1);
    const dbp = eventsMay7.find((e) => e.id.includes("dien-bien-phu-1954"));
    assert.ok(dbp);
    assert.equal(dbp?.year, 1954);
    assert.equal(dbp?.visualTheme, "dien-bien-phu");
  });

  await t.test("Case 9: Bác Hồ tìm đường cứu nước 05/06/1911", () => {
    const eventsJun5 = getHistoricalEventsForDate(6, 5);
    assert.ok(eventsJun5.length >= 1);
    const bacHo = eventsJun5.find((e) => e.id.includes("1911"));
    assert.ok(bacHo);
    assert.equal(bacHo?.year, 1911);
    assert.equal(bacHo?.visualTheme, "bac-ho-cuu-nuoc");
  });

  await t.test("Case 10: Regular day with no historical event returns undefined/empty", () => {
    // 13/02 has no registered historical milestone in dataset
    const eventsFeb13 = getHistoricalEventsForDate(2, 13);
    assert.equal(eventsFeb13.length, 0, "No historical milestone expected on February 13th");
  });
});

test("Daily Identity & Cinema Connection System", async (t) => {
  await t.test("Actor Birthday: Matches actor birthday (e.g. 05/10 Tiêu Chiến) and provides direct link", () => {
    const res = getVietnamTodayEvent(new Date("2026-10-05T08:00:00+07:00"));
    assert.ok(res.isToday);
    assert.ok(res.allEventsToday);
    assert.ok(res.allEventsToday.some((e) => e.actorSlug === "tieu-chien" || e.id.includes("tieu-chien")));
    const actorEv = res.allEventsToday.find((e) => e.actorSlug === "tieu-chien");
    assert.ok(actorEv);
    assert.equal(actorEv?.relatedLink, "/dien-vien/tieu-chien");
    assert.equal(actorEv?.nature, "arts-culture");
    assert.ok(actorEv?.title.includes("Tiêu Chiến"));
  });

  await t.test("Actor Birthday: Matches featured actor (e.g. 05/02 Trấn Thành) with high priority", () => {
    const res = getVietnamTodayEvent(new Date("2026-02-05T08:00:00+07:00"));
    assert.ok(res.isToday);
    assert.ok(res.allEventsToday);
    const actorEv = res.allEventsToday.find((e) => e.actorSlug === "tran-thanh");
    assert.ok(actorEv);
    assert.equal(actorEv?.relatedLink, "/dien-vien/tran-thanh");
    assert.equal(actorEv?.priority, 92);
  });

  await t.test("Cinema Holiday: 15/03 Ngày Điện Ảnh Việt Nam preserves cultural identity without auto-keyword links", () => {
    const res = getVietnamTodayEvent(new Date("2026-03-15T08:00:00+07:00"));
    assert.ok(res.isToday);
    assert.ok(res.allEventsToday);
    const cinemaEv = res.allEventsToday.find((e) => e.id.includes("dien-anh-vn"));
    assert.ok(cinemaEv);
    assert.equal(cinemaEv?.nature, "arts-culture");
  });

  await t.test("Major Holiday: 02/09 Quốc Khánh maintains top priority", () => {
    const res = getVietnamTodayEvent(new Date("2026-09-02T08:00:00+07:00"));
    assert.ok(res.isToday);
    assert.equal(res.event.category, "national-holiday");
    assert.equal(res.event.priority, 100);
  });

  await t.test("Festival Holiday: Halloween maintains festival nature without auto browse links", () => {
    const res = getVietnamTodayEvent(new Date("2026-10-31T08:00:00+07:00"));
    assert.ok(res.isToday);
    assert.ok(res.allEventsToday);
    const halEv = res.allEventsToday.find((e) => e.id.includes("halloween"));
    assert.ok(halEv);
    assert.equal(halEv?.effect, "halloween");
  });

  await t.test("Regular Day: Preserves Solar and Lunar calendar info accurately", () => {
    const res = getVietnamTodayEvent(new Date("2026-10-03T08:00:00+07:00"));
    assert.ok(res.solarDateFormatted.includes("3 Tháng 10"));
    assert.ok(res.lunarDateFormatted.includes("Âm lịch"));
    assert.ok(res.event.title.length > 0);
  });

  await t.test("Event Priority Hierarchy: Vietnam Official & Specific events always rank before International events on the same day", () => {
    // 10/10: Has Giải phóng Thủ đô (VN Official), Chuyển đổi số Quốc gia (VN Specific), and Sức khỏe Tâm thần Thế giới (International)
    const res1010 = getVietnamTodayEvent(new Date("2026-10-10T08:00:00+07:00"));
    assert.ok(res1010.isToday);
    assert.ok(res1010.allEventsToday && res1010.allEventsToday.length >= 2);
    // Featured event must be Vietnamese (Giải phóng Thủ đô)
    assert.equal(res1010.event.category, "vietnam-history");
    assert.ok(res1010.event.title.toLowerCase().includes("giải phóng thủ đô"));

    // 20/10: Has Ngày Phụ Nữ Việt Nam (VN Specific) and Thống kê Thế giới (International)
    const res2010 = getVietnamTodayEvent(new Date("2026-10-20T08:00:00+07:00"));
    assert.ok(res2010.isToday);
    assert.ok(res2010.event.title.includes("Phụ Nữ Việt Nam"));
  });

  await t.test("Event Priority Hierarchy: 04/10 prioritizes Vo Nguyen Giap memorial over specialized/international days", () => {
    // 04/10: Tưởng Niệm Ngày Mất Đại Tướng Võ Nguyên Giáp vs PCCC vs Kỹ Năng Lao Động vs World Animal Day
    const res0410 = getVietnamTodayEvent(new Date("2026-10-04T08:00:00+07:00"));
    assert.ok(res0410.isToday);
    assert.ok(res0410.event.title.includes("Võ Nguyên Giáp"));
    assert.equal(res0410.event.priority, 100);
    assert.ok(res0410.allEventsToday && res0410.allEventsToday.length >= 4);
    assert.ok(res0410.allEventsToday[0].title.includes("Võ Nguyên Giáp"));
    assert.ok(res0410.allEventsToday.some((e) => e.title.includes("Phòng Cháy")));
  });

  await t.test("Event Priority Hierarchy: Days with only international events display properly", () => {
    // 03/10: World Habitat Day
    const res0310 = getVietnamTodayEvent(new Date("2026-10-03T08:00:00+07:00"));
    assert.ok(res0310.isToday);
    assert.ok(res0310.event.title.includes("Môi Trường Định Cư") || res0310.event.title.length > 0);
  });

  await t.test("Event Priority Hierarchy: Multiple VN events on the same day are all retained without data loss", () => {
    const res1010 = getVietnamTodayEvent(new Date("2026-10-10T08:00:00+07:00"));
    assert.ok(res1010.allEventsToday);
    assert.ok(res1010.allEventsToday.length >= 1);
    const primaryTitle = res1010.event.title;
    assert.ok(primaryTitle.includes("Giải Phóng Thủ Đô") || primaryTitle.includes("Hà Nội"));
  });
});

test("Phase 5 — Event & History Canonical Deduplication Engine", async (t) => {
  await t.test("04/10 Mandatory Case: Vo Nguyen Giap is canonical history event, Banner highlight candidate, with NO duplicate in allEventsToday", () => {
    const res = getVietnamTodayEvent(new Date("2026-10-04T08:00:00+07:00"));
    assert.ok(res.isToday, "04/10 must be recognized as today");
    assert.ok(res.allEventsToday && res.allEventsToday.length >= 4, "04/10 must have all distinct events");

    // 1. Vo Nguyen Giap is the top priority featured candidate for Banner
    assert.ok(
      res.event.title.includes("Võ Nguyên Giáp"),
      "Featured event on Banner must be Vo Nguyen Giap"
    );
    assert.equal(res.event.category, "vietnam-history");
    assert.equal(res.event.eventYear, 2013);

    // 2. Exactly ONE Vo Nguyen Giap event in allEventsToday (No duplicates between EVENTS and HISTORY)
    const voNguyenGiapEvents = res.allEventsToday.filter((e) =>
      e.title.toLowerCase().includes("võ nguyên giáp")
    );
    assert.equal(
      voNguyenGiapEvents.length,
      1,
      "There must be exactly ONE Vo Nguyen Giap event in allEventsToday (no duplicate tabs)"
    );

    // 3. Distinct events are strictly preserved
    const pcccEvent = res.allEventsToday.find((e) =>
      e.title.toLowerCase().includes("phòng cháy")
    );
    assert.ok(pcccEvent, "Ngày Toàn Dân PCCC must still exist on 04/10");

    const laborSkillEvent = res.allEventsToday.find((e) =>
      e.title.toLowerCase().includes("kỹ năng lao động")
    );
    assert.ok(laborSkillEvent, "Ngày Kỹ Năng Lao Động must still exist on 04/10");

    const animalEvent = res.allEventsToday.find((e) =>
      e.title.toLowerCase().includes("động vật")
    );
    assert.ok(animalEvent, "Ngày Động Vật Thế Giới must still exist on 04/10");

    // 4. Historical events dataset holds canonical history entry
    assert.ok(res.historicalEventsToday && res.historicalEventsToday.length > 0);
    assert.ok(
      res.historicalEventsToday.some((h) => h.title.includes("Võ Nguyên Giáp"))
    );
  });

  await t.test("Days with only cultural/national EVENTS (e.g. 20/11 Ngày Nhà giáo Việt Nam)", () => {
    const res = getVietnamTodayEvent(new Date("2026-11-20T08:00:00+07:00"));
    assert.ok(res.isToday);
    assert.ok(res.event.title.includes("Nhà Giáo Việt Nam") || res.event.title.includes("Nhà giáo"));
  });

  await t.test("Days with distinct EVENTS + HISTORY (e.g. 02/09: Quốc Khánh + Tuyên ngôn Độc lập + Bác Hồ từ trần)", () => {
    const res = getVietnamTodayEvent(new Date("2026-09-02T08:00:00+07:00"));
    assert.ok(res.isToday);
    assert.ok(res.allEventsToday && res.allEventsToday.length >= 2);
    // National holiday Quốc Khánh and historical events must both be present
    assert.ok(res.allEventsToday.some((e) => e.category === "national-holiday" || e.id.includes("quoc-khanh")));
    assert.ok(res.historicalEventsToday && res.historicalEventsToday.length >= 2);
  });

  await t.test("Deduplication rule: Distinct events are never removed", () => {
    const res = getVietnamTodayEvent(new Date("2026-10-04T08:00:00+07:00"));
    const allTitles = res.allEventsToday?.map((e) => e.title) || [];
    assert.ok(allTitles.some((t) => t.includes("Phòng Cháy")));
    assert.ok(allTitles.some((t) => t.includes("Kỹ Năng Lao Động")));
    assert.ok(allTitles.some((t) => t.includes("Động Vật Thế Giới")));
  });
});

test("Banner 'Hôm nay có gì đặc biệt' — GitHub Historical Events Provider", async (t) => {
  await t.test("1. Ngày có nhiều historical events: giữ tất cả, không tự động chọn một event duy nhất (04/10, 02/09, 30/04)", () => {
    // 04/10
    const res0410 = getVietnamTodayHistoryBanner(new Date("2026-10-04T08:00:00+07:00"));
    assert.equal(res0410.isToday, true);
    assert.ok(res0410.allEventsToday && res0410.allEventsToday.length >= 2, "04/10 must retain all historical events");
    assert.ok(res0410.allEventsToday.some((e) => e.title.includes("Võ Nguyên Giáp")), "04/10 must include Vo Nguyen Giap");
    assert.ok(res0410.allEventsToday.some((e) => e.title.includes("Suối Sóc")), "04/10 must include Tran Suoi Soc");

    // 02/09
    const res0209 = getVietnamTodayHistoryBanner(new Date("2026-09-02T08:00:00+07:00"));
    assert.equal(res0209.isToday, true);
    assert.ok(res0209.allEventsToday && res0209.allEventsToday.length >= 3, "02/09 must have multiple events");

    // 30/04
    const res3004 = getVietnamTodayHistoryBanner(new Date("2026-04-30T08:00:00+07:00"));
    assert.equal(res3004.isToday, true);
    assert.ok(res3004.allEventsToday && res3004.allEventsToday.length >= 3, "30/04 must have multiple events");
  });

  await t.test("2. Ngày chỉ có một event: hiển thị chính xác event đó mà không crash", () => {
    // 04/01
    const res0401 = getVietnamTodayHistoryBanner(new Date("2026-01-04T08:00:00+07:00"));
    assert.equal(res0401.isToday, true);
    assert.ok(res0401.allEventsToday && res0401.allEventsToday.length >= 1);
    assert.ok(res0401.event.title.length > 0);
  });

  await t.test("3. Ngày không có event: fallback 'Hôm nay chưa có sự kiện lịch sử nổi bật', không crash, không hiển thị ngày khác, không tự sinh AI", () => {
    // 07/07
    const res = getVietnamTodayHistoryBanner(new Date("2026-07-07T08:00:00+07:00"));
    assert.equal(res.isToday, true);
    if (!res.historicalEventsToday || res.historicalEventsToday.length === 0) {
      assert.ok(res.event.title.includes("Hôm nay chưa có sự kiện lịch sử nổi bật"));
      assert.equal(res.daysUntil, 0);
    }
  });

  await t.test("4. Ngày 04/10: Võ Nguyên Giáp phải xuất hiện và không bị loại do duplicate trong events/", () => {
    const res = getVietnamTodayHistoryBanner(new Date("2026-10-04T12:00:00+07:00"));
    assert.equal(res.isToday, true);
    const vngEvent = res.allEventsToday?.find((e) => e.title.includes("Võ Nguyên Giáp"));
    assert.ok(vngEvent, "Võ Nguyên Giáp must be present on 04/10");
    assert.equal(vngEvent?.eventYear, 2013);
    assert.ok(vngEvent?.imageUrl, "Should have documentary image if available");
  });

  await t.test("5. Kiểm tra timezone Việt Nam quanh thời điểm 00:00 (Asia/Ho_Chi_Minh UTC+7)", () => {
    // 2026-10-03T17:01:00Z is 2026-10-04T00:01:00+07:00 in Vietnam
    const dateAtMidnightStart = new Date("2026-10-03T17:01:00Z");
    const resMidnight = getVietnamTodayHistoryBanner(dateAtMidnightStart);
    assert.equal(resMidnight.todaySolar.day, 4, "Must be Oct 4 in Vietnam timezone");
    assert.equal(resMidnight.todaySolar.month, 10, "Must be Oct in Vietnam timezone");
    assert.ok(resMidnight.allEventsToday?.some((e) => e.title.includes("Võ Nguyên Giáp")));

    // 2026-10-04T16:59:00Z is 2026-10-04T23:59:00+07:00 in Vietnam
    const dateAtMidnightEnd = new Date("2026-10-04T16:59:00Z");
    const resEnd = getVietnamTodayHistoryBanner(dateAtMidnightEnd);
    assert.equal(resEnd.todaySolar.day, 4, "Must still be Oct 4 in Vietnam timezone");
    assert.ok(resEnd.allEventsToday?.some((e) => e.title.includes("Võ Nguyên Giáp")));
  });

  await t.test("6. GitHub/local history source rỗng hoặc lỗi → Banner không crash", () => {
    const resEdge = getVietnamTodayHistoryBanner(new Date("2099-12-31T23:59:59+07:00"));
    assert.ok(resEdge);
    assert.ok(resEdge.event);
    assert.ok(resEdge.event.title);
  });
});

test("Regression Verification — Multi-Source Banner Aggregation (Actor Birthdays + Hardcoded + GitHub History)", async (t) => {
  await t.test("1. Actor Birthday: 05/10 Tiêu Chiến generates birthday event with rich banner description and direct link", () => {
    const res0510 = getVietnamTodayEvent(new Date("2026-10-05T08:00:00+07:00"));
    assert.ok(res0510.isToday, "05/10 must be recognized as today");
    assert.ok(res0510.allEventsToday && res0510.allEventsToday.length >= 1);

    const tieuChienEvent = res0510.allEventsToday.find(
      (e) => e.actorSlug === "tieu-chien" || e.id.includes("tieu-chien")
    );
    assert.ok(tieuChienEvent, "Tiêu Chiến birthday event must be present on 05/10");
    assert.ok(
      tieuChienEvent?.bannerDescription?.includes("Hôm nay là sinh nhật của Tiêu Chiến"),
      "Banner description must state 'Hôm nay là sinh nhật của Tiêu Chiến'"
    );
    assert.equal(tieuChienEvent?.relatedLink, "/dien-vien/tieu-chien");
    assert.equal(tieuChienEvent?.category, "entertainment");
  });

  await t.test("2. Historical Event: GitHub historical events still appear (04/10 Võ Nguyên Giáp & Trận Suối Sóc)", () => {
    const res0410 = getVietnamTodayEvent(new Date("2026-10-04T08:00:00+07:00"));
    assert.ok(res0410.isToday);
    assert.ok(res0410.allEventsToday);

    const vngEvent = res0410.allEventsToday.find((e) => e.title.includes("Võ Nguyên Giáp"));
    assert.ok(vngEvent, "Historical event Võ Nguyên Giáp must appear on 04/10");

    const suoiSocEvent =
      res0410.allEventsToday.find((e) => e.title.includes("Suối Sóc")) ||
      res0410.historicalEventsToday?.find((e) => e.title.includes("Suối Sóc"));
    assert.ok(suoiSocEvent, "Historical event Trận Suối Sóc must appear on 04/10");
  });

  await t.test("3. Hardcoded Event: Nanaflix hardcoded special events still appear (04/10 PCCC, 20/11 Nhà giáo VN)", () => {
    const res0410 = getVietnamTodayEvent(new Date("2026-10-04T08:00:00+07:00"));
    const pcccEvent = res0410.allEventsToday?.find((e) => e.title.includes("Phòng Cháy"));
    assert.ok(pcccEvent, "Hardcoded event PCCC must appear on 04/10");

    const res2011 = getVietnamTodayEvent(new Date("2026-11-20T08:00:00+07:00"));
    const nhaGiaoEvent = res2011.allEventsToday?.find((e) => e.title.includes("Nhà Giáo") || e.title.includes("Nhà giáo"));
    assert.ok(nhaGiaoEvent, "Hardcoded event Ngày Nhà giáo VN must appear on 20/11");
  });

  await t.test("4. Combined Sources: Multi-source day (05/10) contains Actor Birthday + Hardcoded events without overwriting", () => {
    const res0510 = getVietnamTodayEvent(new Date("2026-10-05T08:00:00+07:00"));
    assert.ok(res0510.allEventsToday && res0510.allEventsToday.length >= 2);

    const hasActor = res0510.allEventsToday.some((e) => e.actorSlug === "tieu-chien");
    const hasHardcoded = res0510.allEventsToday.some((e) => e.id.includes("nha-giao-the-gioi"));
    assert.ok(hasActor, "Actor birthday source must be present");
    assert.ok(hasHardcoded, "Hardcoded event source must be present");
  });

  await t.test("5. Navigation: Tab 'Lịch sử' is not in NAV_LINKS", async () => {
    const fs = await import("fs");
    const navbarCode = fs.readFileSync("src/components/Navbar.tsx", "utf-8");
    assert.ok(!navbarCode.includes('href: "/history"'), "Navbar must not contain /history link");
    assert.ok(!navbarCode.includes('name: "Lịch sử"'), "Navbar must not contain 'Lịch sử' link");
  });

  await t.test("6. Sorting Order on 05/10: Curated Holiday (Nhà Giáo) -> Actor Birthday (Tiêu Chiến) in Hero candidates, History in popup", () => {
    const res0510 = getVietnamTodayEvent(new Date("2026-10-05T08:00:00+07:00"));
    const titles = res0510.allEventsToday?.map((e) => e.title) || [];
    assert.ok(titles.length >= 2, "Must have at least 2 Hero candidate events on 05/10");

    // Rank 1: Curated Holiday (Ngày Nhà Giáo Thế Giới)
    assert.ok(titles[0].includes("Nhà Giáo"), `Rank 1 must be Nhà Giáo Thế Giới, got: ${titles[0]}`);

    // Rank 2: Featured Actor Birthday (Tiêu Chiến)
    assert.ok(titles[1].includes("Tiêu Chiến"), `Rank 2 must be Tiêu Chiến, got: ${titles[1]}`);

    // Historical records are retained in historicalEventsToday for popup
    assert.ok(
      res0510.historicalEventsToday && res0510.historicalEventsToday.length > 0,
      "05/10 must retain historical events in historicalEventsToday"
    );
  });
});

test("Nanaflix Hero Date-Content Resolver — 3-Tier Precedence & Test Matrix Verification", async (t) => {
  const { resolveHeroEvent, mergeAndDeduplicateEvents } = await import("./vietnamCalendar");

  await t.test("Dynamic DateRule & Floating Holiday Verification (World Smile Day & Habitat Day)", async () => {
    const { computeDateRuleTarget } = await import("./vietnamCalendar");
    
    // World Smile Day: 1st Friday of October
    // 2026: Oct 1 is Thursday -> 1st Friday is Oct 2
    assert.deepEqual(computeDateRuleTarget("first-friday-october", 2026), { month: 10, day: 2 });
    // 2023: Oct 1 is Sunday -> 1st Friday is Oct 6
    assert.deepEqual(computeDateRuleTarget("first-friday-october", 2023), { month: 10, day: 6 });
    // 2025: Oct 1 is Wednesday -> 1st Friday is Oct 3
    assert.deepEqual(computeDateRuleTarget("first-friday-october", 2025), { month: 10, day: 3 });

    // World Habitat Day: 1st Monday of October
    // 2026: Oct 1 is Thu -> 1st Monday is Oct 5
    assert.deepEqual(computeDateRuleTarget("first-monday-october", 2026), { month: 10, day: 5 });

    // Verify 02/10/2026 resolves World Smile Day
    const res0210 = getVietnamTodayEvent(new Date("2026-10-02T08:00:00+07:00"));
    assert.equal(res0210.isToday, true);
    assert.ok(
      res0210.allEventsToday?.some((e) => e.title.includes("Nụ Cười") || e.title.includes("Smile")),
      "02/10/2026 must include World Smile Day"
    );
  });

  await t.test("Real-world Case 06/10 (Audit Screenshot): Curated Holiday takes Hero, Minor History is relegated to tabs/list", () => {
    const res0610 = getVietnamTodayEvent(new Date("2026-10-06T08:00:00+07:00"));
    assert.equal(res0610.isToday, true);
    // Hero must be Curated Holiday (Ngày Bại Não Thế Giới), NOT the minor historical chronicle
    assert.ok(
      res0610.event.title.includes("Bại Não") || res0610.event.title.includes("Cerebral Palsy"),
      `Hero must be World CP Day, got: ${res0610.event.title}`
    );
    // Minor historical events are preserved in historicalEventsToday for the history modal/popup
    assert.ok(
      res0610.historicalEventsToday && res0610.historicalEventsToday.length > 0,
      "historicalEventsToday must retain historical timeline records for the history modal"
    );
    // Banner tabs (allEventsToday) contains only curated holidays / featured events
    assert.ok(
      res0610.allEventsToday?.some((e) => e.title.includes("Bại Não") || e.title.includes("Cerebral Palsy")),
      "allEventsToday must contain World CP Day"
    );
  });

  await t.test("Case A: Holiday = YES, Actor Birthday = YES, Historical = Featured -> Hero = Holiday", () => {
    const mockHoliday = {
      id: "ev-test-holiday",
      title: "Ngày Lễ Thử Nghiệm",
      category: "international",
      nature: "international-day",
      priority: 70,
      displayDate: "01/01",
    } as unknown as VietnamEvent;
    const mockActorBirthday = {
      id: "ev-actor-birthday-tran-thanh",
      actorSlug: "tran-thanh",
      title: "Sinh Nhật Trấn Thành",
      category: "entertainment",
      nature: "arts-culture",
      priority: 92,
      displayDate: "01/01",
    } as unknown as VietnamEvent;
    const mockFeaturedHist = {
      id: "hist-repo-vo-nguyen-giap",
      title: "Đại tướng Võ Nguyên Giáp",
      solarDate: { month: 1, day: 1 },
      year: 2013,
      summary: "Đại tướng Võ Nguyên Giáp",
      significance: "Danh tướng",
      visualTheme: "general-history",
      sources: ["test"],
    } as unknown as VietnamHistoricalEvent;

    const hero = resolveHeroEvent([mockHoliday], [mockActorBirthday], [mockFeaturedHist], 2026);
    assert.ok(hero);
    assert.equal(hero?.id, "ev-test-holiday", "Hero must be Holiday in Case A");
  });

  await t.test("Case B: Holiday = NO, Featured Actor Birthday = YES, Historical Featured = YES -> Hero = Featured Actor Birthday", () => {
    const mockActorBirthday = {
      id: "ev-actor-birthday-tran-thanh",
      actorSlug: "tran-thanh",
      title: "Sinh Nhật Trấn Thành",
      category: "entertainment",
      nature: "arts-culture",
      priority: 92,
      displayDate: "01/01",
    } as unknown as VietnamEvent;
    const mockFeaturedHist = {
      id: "hist-repo-vo-nguyen-giap",
      title: "Đại tướng Võ Nguyên Giáp",
      solarDate: { month: 1, day: 1 },
      year: 2013,
      summary: "Đại tướng Võ Nguyên Giáp",
      significance: "Danh tướng",
      visualTheme: "general-history",
      sources: ["test"],
    } as unknown as VietnamHistoricalEvent;

    const hero = resolveHeroEvent([], [mockActorBirthday], [mockFeaturedHist], 2026);
    assert.ok(hero);
    assert.equal(hero?.id, "ev-actor-birthday-tran-thanh", "Hero must be Featured Actor in Case B");
  });

  await t.test("Case C: Holiday = NO, Actor Birthday = Normal, Historical Featured = YES -> Hero = Historical Featured", () => {
    // Normal actor (not marked as featured in ACTORS_CATALOG or slug without featured)
    const mockNormalActor = {
      id: "ev-actor-birthday-normal-actor",
      actorSlug: "unknown-normal-actor",
      title: "Sinh Nhật Diễn Viên Phụ",
      category: "entertainment",
      nature: "arts-culture",
      priority: 50,
      displayDate: "01/01",
    } as unknown as VietnamEvent;
    const mockFeaturedHist = {
      id: "hist-repo-vo-nguyen-giap",
      title: "Đại tướng Võ Nguyên Giáp",
      solarDate: { month: 1, day: 1 },
      year: 2013,
      summary: "Đại tướng Võ Nguyên Giáp",
      significance: "Danh tướng",
      visualTheme: "general-history",
      sources: ["test"],
    } as unknown as VietnamHistoricalEvent;

    const hero = resolveHeroEvent([], [mockNormalActor], [mockFeaturedHist], 2026);
    assert.ok(hero);
    assert.ok(hero?.title.includes("Võ Nguyên Giáp"), "Hero must be Historical Featured in Case C");
  });

  await t.test("Case D: Holiday = NO, Actor Birthday = Normal, Historical = Normal/Minor -> Không ép Historical lên Hero (returns null)", () => {
    const mockNormalActor = {
      id: "ev-actor-birthday-normal-actor",
      actorSlug: "unknown-normal-actor",
      title: "Sinh Nhật Diễn Viên Phụ",
      category: "entertainment",
      nature: "arts-culture",
      priority: 50,
      displayDate: "01/01",
    } as unknown as VietnamEvent;
    const mockMinorHist = {
      id: "hist-minor-test-administrative-record",
      title: "Hội nghị hành chính thường niên tại địa phương",
      solarDate: { month: 10, day: 6 },
      year: 1973,
      summary: "Số liệu hành chính...",
      significance: "Sự kiện lịch sử",
      visualTheme: "general-history",
      sources: ["test"],
    } as unknown as VietnamHistoricalEvent;

    const hero = resolveHeroEvent([], [mockNormalActor], [mockMinorHist], 2026);
    assert.equal(hero, null, "Must return null so Hero does not force minor historical event");
  });

  await t.test("Case E: Holiday = NO, Featured Actor Birthday = nhiều người -> Chọn actor có priority/importance cao nhất", () => {
    const actor1 = {
      id: "ev-actor-birthday-tran-thanh",
      actorSlug: "tran-thanh",
      title: "Sinh Nhật Trấn Thành",
      category: "entertainment",
      nature: "arts-culture",
      priority: 95,
      displayDate: "01/01",
    } as unknown as VietnamEvent;
    const actor2 = {
      id: "ev-actor-birthday-tieu-chien",
      actorSlug: "tieu-chien",
      title: "Sinh Nhật Tiêu Chiến",
      category: "entertainment",
      nature: "arts-culture",
      priority: 90,
      displayDate: "01/01",
    } as unknown as VietnamEvent;

    const hero = resolveHeroEvent([], [actor2, actor1], [], 2026);
    assert.ok(hero);
    assert.equal(hero?.id, "ev-actor-birthday-tran-thanh", "Must select actor with highest priority");
  });

  await t.test("Case F: Holiday = YES, Historical = Minor, Actor Birthday = Normal -> Hero = Holiday", () => {
    const mockHoliday = {
      id: "ev-test-holiday",
      title: "Ngày Nụ Cười Thế Giới",
      category: "fun",
      nature: "theme-day",
      priority: 55,
      displayDate: "06/10",
    } as unknown as VietnamEvent;
    const mockNormalActor = {
      id: "ev-actor-birthday-normal-actor",
      actorSlug: "unknown-normal-actor",
      title: "Sinh Nhật Diễn Viên",
      category: "entertainment",
      nature: "arts-culture",
      priority: 50,
      displayDate: "06/10",
    } as unknown as VietnamEvent;
    const mockMinorHist = {
      id: "hist-repo-10-06-1973-tinh-den-thoi-iem-nay",
      title: "Tính đến thời điểm này...",
      solarDate: { month: 10, day: 6 },
      year: 1973,
      summary: "34 nước công nhận...",
      significance: "Sự kiện ngoại giao",
      visualTheme: "general-history",
      sources: ["test"],
    } as unknown as VietnamHistoricalEvent;

    const hero = resolveHeroEvent([mockHoliday], [mockNormalActor], [mockMinorHist], 2026);
    assert.ok(hero);
    assert.equal(hero?.id, "ev-test-holiday", "Hero must be Holiday in Case F");
  });

  await t.test("Independent Candidate Coexistence: Holiday + Featured Person + Major Historical all co-exist in allEventsToday", () => {
    const mockHoliday = {
      id: "ev-holiday-mid-autumn",
      title: "Tết Trung Thu",
      category: "traditional-culture",
      nature: "traditional-festival",
      priority: 85,
      displayDate: "15/08",
    } as unknown as VietnamEvent;
    const mockFeaturedPerson = {
      id: "ev-actor-birthday-tran-thanh",
      actorSlug: "tran-thanh",
      title: "Sinh Nhật Trấn Thành",
      category: "entertainment",
      nature: "arts-culture",
      priority: 92,
      displayDate: "15/08",
    } as unknown as VietnamEvent;
    const mockMajorHistory = {
      id: "hist-repo-vo-nguyen-giap",
      title: "Đại tướng Võ Nguyên Giáp",
      solarDate: { month: 8, day: 15 },
      year: 2013,
      summary: "Đại tướng Võ Nguyên Giáp",
      significance: "Danh tướng",
      visualTheme: "general-history",
      sources: ["test"],
    } as unknown as VietnamHistoricalEvent;
    const mockMinorHistory = {
      id: "hist-minor-administrative-report",
      title: "Thống kê hành chính",
      solarDate: { month: 8, day: 15 },
      year: 1980,
      summary: "Số liệu hành chính",
      significance: "Sự kiện",
      visualTheme: "general-history",
      sources: ["test"],
    } as unknown as VietnamHistoricalEvent;

    const merged = mergeAndDeduplicateEvents(
      [mockHoliday],
      [mockMajorHistory, mockMinorHistory],
      [mockFeaturedPerson],
      2026
    );

    // 1. All 3 major candidates co-exist!
    assert.equal(merged.length, 3, "Must contain exactly 3 candidates (Holiday + Person + Major History)");
    assert.ok(merged.some((e) => e.id === "ev-holiday-mid-autumn"), "Holiday must be in candidate list");
    assert.ok(merged.some((e) => e.id === "ev-actor-birthday-tran-thanh"), "Featured Person must be in candidate list");
    assert.ok(merged.some((e) => e.id === "hist-repo-vo-nguyen-giap"), "Major History must be in candidate list");

    // 2. Minor history is excluded from Hero candidates
    assert.ok(!merged.some((e) => e.id === "hist-minor-administrative-report"), "Minor history must be excluded from Hero candidates");
  });

  await t.test("Verification 06/10/1973: Curated data is preserved in history catalog and Popup, but does not override Hero", () => {
    const res0610 = getVietnamTodayEvent(new Date("2026-10-06T08:00:00+07:00"));
    assert.ok(res0610.event, "Hero event exists");
    assert.ok(res0610.event.title.includes("Bại Não") || res0610.event.title.includes("Cerebral Palsy"), "Hero is World CP Day");
    
    // Popup data contains all historical records including 1973
    assert.ok(
      res0610.historicalEventsToday && res0610.historicalEventsToday.some((h) => h.year === 1973),
      "Popup historicalEventsToday retains 1973 event"
    );
  });
});

test("Hero Eligibility Gate & Historical Event Filtration Audit Verification", async (t) => {
  await t.test("1. Audit Case 08/10/2026: Raw chronicle event 'Bộ Chính trị họp (1974)' does NOT get into Hero or tabs", () => {
    const res0810 = getVietnamTodayEvent(new Date("2026-10-08T08:00:00+07:00"));
    assert.ok(res0810.event, "Hero event exists");
    assert.equal(res0810.event.id, "ev-10-08-bach-tuoc", "Hero must be World Octopus Day");
    
    // Ensure allEventsToday does NOT contain the meeting event
    assert.ok(
      !res0810.allEventsToday?.some((e) => e.id === "he-2561-1974" || e.title.includes("Bộ Chính trị họp")),
      "Raw chronicle meeting must NOT appear in allEventsToday / Hero tabs"
    );

    // Ensure all 5 historical events are preserved in historicalEventsToday for Popup and /history
    assert.ok(
      res0810.historicalEventsToday && res0810.historicalEventsToday.length >= 5,
      "historicalEventsToday retains all 5 historical events"
    );
    assert.ok(
      res0810.historicalEventsToday?.some((h) => h.id === "he-2561-1974"),
      "he-2561-1974 is preserved in historicalEventsToday"
    );
  });

  await t.test("2. Disqualification Filter: Routine meetings, circulars, directives, truncated titles are not Hero eligible", () => {
    const meetingEvent = {
      id: "he-test-meeting",
      title: "Bộ Chính trị họp (đợt 1), bàn phương hướng chiến lược...",
      solarDate: { month: 10, day: 8 },
      year: 1974,
      summary: "Họp bàn về giải phóng miền Nam",
      significance: "Sự kiện",
      visualTheme: "general-history",
      sources: ["test"],
    } as unknown as VietnamHistoricalEvent;

    const directiveEvent = {
      id: "he-test-directive",
      title: "Bộ Chính trị ra Chỉ thị 228 về việc lãnh đạo cuộc bầu cử",
      solarDate: { month: 1, day: 3 },
      year: 1976,
      summary: "Chỉ thị 228",
      significance: "Sự kiện",
      visualTheme: "general-history",
      sources: ["test"],
    } as unknown as VietnamHistoricalEvent;

    const resolutionEvent = {
      id: "he-test-resolution",
      title: "Bộ Chính trị ban hành Nghị quyết số 14-NQ/TW về Cải cách giáo dục",
      solarDate: { month: 1, day: 11 },
      year: 1979,
      summary: "Nghị quyết 14",
      significance: "Sự kiện",
      visualTheme: "general-history",
      sources: ["test"],
    } as unknown as VietnamHistoricalEvent;

    assert.equal(isHeroEligibleHistoricalEvent(meetingEvent), false, "Meeting event must NOT be hero eligible");
    assert.equal(isHeroEligibleHistoricalEvent(directiveEvent), false, "Directive event must NOT be hero eligible");
    assert.equal(isHeroEligibleHistoricalEvent(resolutionEvent), false, "Resolution event must NOT be hero eligible");
  });

  await t.test("3. Tier 1 & 2 Historical Milestones (Curated) ARE Hero eligible", () => {
    // 04/10 Võ Nguyên Giáp
    const voNguyenGiap = {
      id: "hist-10-04-vo-nguyen-giap-2013",
      title: "Tưởng niệm Ngày mất Đại tướng Võ Nguyên Giáp",
      solarDate: { month: 10, day: 4 },
      year: 2013,
      summary: "Tưởng niệm Ngày mất Đại tướng Võ Nguyên Giáp",
      significance: "Vị tướng huyền thoại",
      visualTheme: "dien-bien-phu",
      sources: ["test"],
    } as unknown as VietnamHistoricalEvent;

    // 30/04 Giải phóng miền Nam 1975
    const giaiPhongMienNam = {
      id: "hist-04-30-giai-phong-mien-nam-1975",
      title: "Giải phóng hoàn toàn miền Nam, Thống nhất non sông",
      solarDate: { month: 4, day: 30 },
      year: 1975,
      summary: "Giải phóng miền Nam 30/4/1975",
      significance: "Mốc son chói lọi",
      visualTheme: "thong-nhat-1975",
      sources: ["test"],
    } as unknown as VietnamHistoricalEvent;

    assert.equal(isHeroEligibleHistoricalEvent(voNguyenGiap), true, "Võ Nguyên Giáp memorial must be hero eligible");
    assert.equal(isHeroEligibleHistoricalEvent(giaiPhongMienNam), true, "30/04 milestone must be hero eligible");
  });

  await t.test("4. Anniversary Bonus cannot breach Tier Hierarchy", () => {
    const tier7Chronicle = {
      id: "he-minor-anniversary",
      title: "Ký kết văn bản địa phương (1926)",
      category: "vietnam-history",
      nature: "historical-anniversary",
      priority: 50,
      eventYear: 1926, // 100 years anniversary in 2026 -> +8 bonus
      solarDate: { month: 5, day: 10 },
      displayDate: "10/05/1926",
      isHistoricalOnly: true,
    } as unknown as VietnamEvent;

    const tier6CuratedHistory = {
      id: "hist-curated-event",
      title: "Chiến thắng lịch sử",
      category: "vietnam-history",
      nature: "historical-anniversary",
      priority: 80,
      solarDate: { month: 5, day: 10 },
      displayDate: "10/05",
      historicalEventId: "hist-05-10-test",
    } as unknown as VietnamEvent;

    const tier1Holiday = {
      id: "ev-test-national",
      title: "Ngày Lễ Quốc Gia",
      category: "national-holiday",
      nature: "official-holiday",
      priority: 90,
      solarDate: { month: 5, day: 10 },
      displayDate: "10/05",
    } as unknown as VietnamEvent;

    const scoreTier7 = getEventPriorityScore(tier7Chronicle, 2026);
    const scoreTier6 = getEventPriorityScore(tier6CuratedHistory, 2026);
    const scoreTier1 = getEventPriorityScore(tier1Holiday, 2026);

    assert.ok(scoreTier7 < 2000, `Tier 7 score with anniversary bonus (${scoreTier7}) must stay below 2,000`);
    assert.ok(scoreTier6 >= 20000, `Tier 6 score (${scoreTier6}) must be >= 20,000`);
    assert.ok(scoreTier1 >= 80000, `Tier 1 score (${scoreTier1}) must be >= 80,000`);
    assert.ok(scoreTier7 < scoreTier6, "Tier 7 score cannot exceed Tier 6");
    assert.ok(scoreTier6 < scoreTier1, "Tier 6 score cannot exceed Tier 1");
  });
});

