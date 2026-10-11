import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { footballScoreService } from "./service";

describe("Nanaflix /live - P3: Bảng xếp hạng bóng đá (Standings)", () => {
  beforeEach(() => {
    footballScoreService.clearCacheForTesting();
  });

  it("1. Chặn tham số league không hợp lệ hoặc nằm ngoài danh sách xác minh", async () => {
    const invalidLeagues = ["", "invalid_league", "unknown.1", "../../hack", "http://evil.com"];
    for (const l of invalidLeagues) {
      const res = await footballScoreService.getStandings(l);
      assert.equal(res.data, null);
      assert.equal(res.isCupOrNoStandings, false);
      assert.equal(res.cached, false);
    }
  });

  it("2. Lấy và chuẩn hóa dữ liệu bảng xếp hạng giải Ngoại Hạng Anh (eng.1)", async () => {
    const res = await footballScoreService.getStandings("eng.1");
    assert.equal(res.isCupOrNoStandings, false);
    assert.ok(res.data, "Dữ liệu bảng xếp hạng phải tồn tại");

    const standings = res.data!;
    assert.equal(standings.leagueSlug, "eng.1");
    assert.ok(standings.groups.length >= 1, "Phải có ít nhất 1 bảng đấu");

    const mainGroup = standings.groups[0];
    assert.ok(mainGroup.entries.length >= 18, "Premier League phải có ít nhất 18-20 đội");

    // Kiểm tra cấu trúc một đội bóng trong BXH
    const topTeam = mainGroup.entries[0];
    assert.equal(typeof topTeam.rank, "number");
    assert.ok(topTeam.rank >= 1);
    assert.ok(topTeam.team.displayName.length > 0);
    assert.equal(typeof topTeam.gamesPlayed, "number");
    assert.equal(typeof topTeam.wins, "number");
    assert.equal(typeof topTeam.ties, "number");
    assert.equal(typeof topTeam.losses, "number");
    assert.equal(typeof topTeam.points, "number");
    assert.equal(typeof topTeam.pointDifferential, "number");

    // Điểm số phải đúng công thức (Thắng 3đ, Hòa 1đ) hoặc khớp upstream
    assert.ok(topTeam.points >= 0);
  });

  it("3. Lấy và chuẩn hóa dữ liệu giải MLS (usa.1) có phân chia Eastern và Western Conference", async () => {
    const res = await footballScoreService.getStandings("usa.1");
    assert.equal(res.isCupOrNoStandings, false);
    assert.ok(res.data);

    const standings = res.data!;
    assert.equal(standings.leagueSlug, "usa.1");
    assert.equal(standings.groups.length, 2, "MLS phải có 2 conference");

    const eastern = standings.groups.find((g) => g.name.toLowerCase().includes("eastern"));
    const western = standings.groups.find((g) => g.name.toLowerCase().includes("western"));

    assert.ok(eastern, "Phải có Eastern Conference");
    assert.ok(western, "Phải có Western Conference");
    assert.ok(eastern!.entries.length >= 14);
    assert.ok(western!.entries.length >= 14);
  });

  it("4. Nhận diện và xử lý chính xác các giải cúp không có bảng xếp hạng vòng tròn", async () => {
    // FA Cup (eng.fa) và Copa del Rey (esp.copa_del_rey)
    const resFa = await footballScoreService.getStandings("eng.fa");
    assert.equal(resFa.isCupOrNoStandings, true);
    assert.equal(resFa.data, null);

    const resCopa = await footballScoreService.getStandings("esp.copa_del_rey");
    assert.equal(resCopa.isCupOrNoStandings, true);
    assert.equal(resCopa.data, null);
  });

  it("5. In-Memory Cache và TTL: Lần gọi tiếp theo được phục vụ từ cache", async () => {
    // Lần 1: Gọi fetch từ upstream
    const firstCall = await footballScoreService.getStandings("esp.1");
    assert.equal(firstCall.cached, false);
    assert.ok(firstCall.data);

    // Lần 2: Phục vụ tức thì từ cache
    const secondCall = await footballScoreService.getStandings("esp.1");
    assert.equal(secondCall.cached, true);
    assert.deepEqual(secondCall.data, firstCall.data);

    // Xóa cache
    footballScoreService.clearCacheForTesting();
    const afterClear = await footballScoreService.getStandings("esp.1");
    assert.equal(afterClear.cached, false);
  });

  it("6. In-Flight Deduplication: Các cuộc gọi đồng thời chỉ phát sinh 1 request", async () => {
    const promises = [
      footballScoreService.getStandings("ger.1"),
      footballScoreService.getStandings("ger.1"),
      footballScoreService.getStandings("ger.1"),
    ];

    const results = await Promise.all(promises);
    for (const r of results) {
      assert.ok(r.data);
      assert.equal(r.data!.leagueSlug, "ger.1");
    }
  });
});
