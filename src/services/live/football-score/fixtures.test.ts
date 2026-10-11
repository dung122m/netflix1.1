import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  footballScoreService,
  formatUtc7Date,
  parseFixtureStatus,
  normalizeFixtures,
  filterFixturesByDate,
} from "./service";
import { NormalizedFixtureItem } from "./types";

describe("Nanaflix /live - P4: Lịch thi đấu & Kết quả bóng đá (Fixtures & Results)", () => {
  beforeEach(() => {
    footballScoreService.clearFixturesCache();
  });

  it("1. Chặn tham số league không hợp lệ hoặc nằm ngoài danh sách xác minh", async () => {
    const invalidLeagues = ["", "invalid_league", "unknown.1", "../../hack", "http://evil.com"];
    for (const l of invalidLeagues) {
      const res = await footballScoreService.getFixtures(l);
      assert.equal(res.data, null);
      assert.equal(res.cached, false);
    }
  });

  it("2. Chuyển đổi timestamp ISO UTC sang múi giờ Việt Nam (UTC+7 - Asia/Ho_Chi_Minh) chuẩn xác", () => {
    // 19:00 UTC ngày 21/08/2026 -> 02:00 sáng ngày 22/08/2026 tại Việt Nam
    const res1 = formatUtc7Date("2026-08-21T19:00:00.000Z");
    assert.equal(res1.kickoffDateUtc7, "2026-08-22");
    assert.equal(res1.kickoffTimeUtc7, "02:00");
    assert.equal(res1.formattedDateUtc7, "Thứ Bảy, 22/08/2026");

    // 14:30 UTC ngày 15/09/2026 -> 21:30 cùng ngày 15/09/2026 tại Việt Nam
    const res2 = formatUtc7Date("2026-09-15T14:30:00.000Z");
    assert.equal(res2.kickoffDateUtc7, "2026-09-15");
    assert.equal(res2.kickoffTimeUtc7, "21:30");
    assert.equal(res2.formattedDateUtc7, "Thứ Ba, 15/09/2026");

    // Xử lý chuỗi rỗng hoặc invalid date an toàn
    const resEmpty = formatUtc7Date("");
    assert.equal(resEmpty.kickoffDateUtc7, "");
    assert.equal(resEmpty.kickoffTimeUtc7, "--:--");

    const resInvalid = formatUtc7Date("invalid-date-string");
    assert.equal(resInvalid.kickoffDateUtc7, "");
    assert.equal(resInvalid.kickoffTimeUtc7, "--:--");
  });

  it("3. Phân tích các trạng thái trận đấu (scheduled, live, finished, postponed, canceled, pen)", () => {
    // Trận sắp diễn ra
    const sched = parseFixtureStatus({
      type: { state: "pre", name: "STATUS_SCHEDULED", description: "Scheduled" },
    });
    assert.equal(sched.status, "scheduled");
    assert.equal(sched.statusText, "Sắp diễn ra");
    assert.equal(sched.completed, false);

    // Trận trực tiếp
    const live = parseFixtureStatus({
      type: { state: "in", name: "STATUS_IN_PROGRESS" },
      displayClock: "75'",
    });
    assert.equal(live.status, "live");
    assert.equal(live.statusText, "75'");
    assert.equal(live.completed, false);

    // Trận kết thúc
    const ft = parseFixtureStatus({
      type: { state: "post", name: "STATUS_FULL_TIME", completed: true },
    });
    assert.equal(ft.status, "finished");
    assert.equal(ft.statusText, "FT");
    assert.equal(ft.completed, true);

    // Trận kết thúc luân lưu (Penalties)
    const pen = parseFixtureStatus({
      type: { state: "post", name: "STATUS_SHOOTOUT", detail: "Arsenal won on penalties" },
    });
    assert.equal(pen.status, "finished");
    assert.equal(pen.statusText, "FT (Pen)");
    assert.equal(pen.completed, true);

    // Trận hoãn
    const postp = parseFixtureStatus({
      type: { state: "post", name: "STATUS_POSTPONED" },
    });
    assert.equal(postp.status, "postponed");
    assert.equal(postp.statusText, "Hoãn");
    assert.equal(postp.completed, false);

    // Trận hủy
    const canc = parseFixtureStatus({
      type: { state: "post", name: "STATUS_CANCELED" },
    });
    assert.equal(canc.status, "canceled");
    assert.equal(canc.statusText, "Hủy");
    assert.equal(canc.completed, false);
  });

  it("4. Chuẩn hóa fixtures từ raw JSON và tính toán availableDates", () => {
    const mockRaw = {
      league: { name: "Premier League", season: { year: 2026 } },
      count: 2,
      pageIndex: 1,
      pageSize: 100,
      pageCount: 1,
      events: [
        {
          id: "1001",
          name: "Chelsea vs Liverpool",
          date: "2026-08-22T14:00:00.000Z", // 21:00 UTC+7 ngày 22/08
          status: { type: { state: "pre", name: "STATUS_SCHEDULED" } },
          competitions: [
            {
              venue: { fullName: "Stamford Bridge" },
              competitors: [
                { homeAway: "home", team: { id: "1", displayName: "Chelsea", abbreviation: "CHE" } },
                { homeAway: "away", team: { id: "2", displayName: "Liverpool", abbreviation: "LIV" } },
              ],
            },
          ],
        },
        {
          id: "1002",
          name: "Arsenal vs Man City",
          date: "2026-08-23T16:30:00.000Z", // 23:30 UTC+7 ngày 23/08
          status: { type: { state: "post", name: "STATUS_FULL_TIME", completed: true } },
          competitions: [
            {
              venue: { fullName: "Emirates Stadium" },
              competitors: [
                { homeAway: "home", score: "2", winner: true, team: { id: "3", displayName: "Arsenal" } },
                { homeAway: "away", score: "1", winner: false, team: { id: "4", displayName: "Man City" } },
              ],
            },
          ],
        },
      ],
    };

    const normalized = normalizeFixtures(mockRaw, "eng.1");
    assert.ok(normalized);
    assert.equal(normalized.leagueName, "Premier League");
    assert.equal(normalized.seasonYear, 2026);
    assert.equal(normalized.events.length, 2);

    // Trận 1 (scheduled)
    const ev1 = normalized.events[0];
    assert.equal(ev1.id, "1001");
    assert.equal(ev1.kickoffDateUtc7, "2026-08-22");
    assert.equal(ev1.kickoffTimeUtc7, "21:00");
    assert.equal(ev1.status, "scheduled");
    assert.equal(ev1.homeTeam.score, undefined); // Trận scheduled không có điểm giả
    assert.equal(ev1.venue, "Stamford Bridge");

    // Trận 2 (finished)
    const ev2 = normalized.events[1];
    assert.equal(ev2.id, "1002");
    assert.equal(ev2.kickoffDateUtc7, "2026-08-23");
    assert.equal(ev2.kickoffTimeUtc7, "23:30");
    assert.equal(ev2.status, "finished");
    assert.equal(ev2.homeTeam.score, 2);
    assert.equal(ev2.awayTeam.score, 1);
    assert.equal(ev2.homeTeam.winner, true);

    // availableDates phải gồm 2 ngày được sắp xếp tăng dần
    assert.deepEqual(normalized.availableDates, ["2026-08-22", "2026-08-23"]);
  });

  it("5. Lọc danh sách trận đấu theo ngày (UTC+7)", () => {
    const events = [
      { id: "1", kickoffDateUtc7: "2026-08-22" } as unknown as NormalizedFixtureItem,
      { id: "2", kickoffDateUtc7: "2026-08-22" } as unknown as NormalizedFixtureItem,
      { id: "3", kickoffDateUtc7: "2026-08-23" } as unknown as NormalizedFixtureItem,
    ];

    const filteredAug22 = filterFixturesByDate(events, "2026-08-22");
    assert.equal(filteredAug22.length, 2);

    const filteredAug23 = filterFixturesByDate(events, "2026-08-23");
    assert.equal(filteredAug23.length, 1);
    assert.equal(filteredAug23[0].id, "3");

    // Không truyền date -> giữ nguyên toàn bộ
    assert.equal(filterFixturesByDate(events, "").length, 3);
  });

  it("6. Lấy và chuẩn hóa dữ liệu fixtures thực tế từ upstream giải Ngoại Hạng Anh (eng.1) và kiểm tra cache", async () => {
    const res1 = await footballScoreService.getFixtures("eng.1", { limit: 10 });
    assert.equal(res1.cached, false);
    assert.ok(res1.data, "Dữ liệu fixtures phải tồn tại");

    const fixtures = res1.data!;
    assert.equal(fixtures.leagueSlug, "eng.1");
    assert.ok(fixtures.events.length > 0);
    assert.ok(fixtures.availableDates.length > 0);

    const firstEvent = fixtures.events[0];
    assert.ok(firstEvent.id.length > 0);
    assert.ok(firstEvent.homeTeam.displayName.length > 0);
    assert.ok(firstEvent.awayTeam.displayName.length > 0);
    assert.ok(firstEvent.kickoffDateUtc7.length > 0);
    assert.ok(firstEvent.kickoffTimeUtc7.length > 0);

    // Lần gọi thứ 2 với cùng tham số phải trả về từ bộ nhớ đệm (cached: true)
    const res2 = await footballScoreService.getFixtures("eng.1", { limit: 10 });
    assert.equal(res2.cached, true);
    assert.equal(res2.data?.events.length, fixtures.events.length);
  });

  it("7. Lấy danh sách kết quả trận đã kết thúc (finished) từ upstream", async () => {
    const res = await footballScoreService.getFixtures("eng.1", { status: "finished", limit: 5 });
    assert.ok(res.data);
    assert.ok(res.data.events.length > 0);

    for (const ev of res.data.events) {
      assert.equal(ev.status, "finished");
      assert.equal(typeof ev.homeTeam.score, "number");
      assert.equal(typeof ev.awayTeam.score, "number");
    }
  });

  it("8. Lấy danh sách lịch thi đấu sắp tới (scheduled) từ upstream", async () => {
    const res = await footballScoreService.getFixtures("eng.1", { status: "scheduled", limit: 5 });
    assert.ok(res.data);
    assert.ok(res.data.events.length > 0);

    for (const ev of res.data.events) {
      assert.equal(ev.status, "scheduled");
      assert.equal(ev.homeTeam.score, undefined);
      assert.equal(ev.awayTeam.score, undefined);
    }
  });
});
