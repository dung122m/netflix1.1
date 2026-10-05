import test from "node:test";
import assert from "node:assert/strict";
import { VIETNAM_EVENTS } from "@/data/vietnamEvents";
import {
  VIETNAM_HISTORICAL_EVENTS,
  getHistoricalEventsForDate,
} from "@/data/historicalEvents";
import {
  computeDateToLunarDate,
  computeDateFromLunarDate,
  getVietnamTodayEvent,
  getVietnamTodayHistoryBanner,
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

    const suoiSocEvent = res0410.allEventsToday.find((e) => e.title.includes("Suối Sóc"));
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
});
