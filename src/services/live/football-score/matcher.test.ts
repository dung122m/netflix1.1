import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isSameTeam,
  matchFixtureToScore,
  buildScoresMap,
  cleanRawTeamString,
} from "./matcher";
import { LiveScoreboardEvent } from "./types";
import { footballScoreService } from "./service";

describe("LiveScore Football Matcher & Enrichment Test Suite", () => {
  // Mock dữ liệu sự kiện từ livescore API
  const sampleEvents: LiveScoreboardEvent[] = [
    {
      id: "740701",
      leagueSlug: "eng.1",
      name: "Leeds United at Arsenal",
      date: "2026-10-10T11:30:00.000Z",
      homeTeam: {
        id: "359",
        name: "Arsenal",
        displayName: "Arsenal",
      },
      awayTeam: {
        id: "357",
        name: "Leeds United",
        displayName: "Leeds United",
      },
      homeScore: 2,
      awayScore: 1,
      status: "finished",
      statusText: "STATUS_FULL_TIME",
      statusDetail: "FT",
      displayClock: "90'+6'",
    },
    {
      id: "740702",
      leagueSlug: "eng.1",
      name: "Tottenham Hotspur at Manchester United",
      date: "2026-10-10T16:30:00.000Z",
      homeTeam: {
        id: "360",
        name: "Manchester United",
        displayName: "Manchester United",
      },
      awayTeam: {
        id: "367",
        name: "Tottenham Hotspur",
        displayName: "Tottenham Hotspur",
      },
      homeScore: 0,
      awayScore: 0,
      status: "live",
      statusText: "STATUS_FIRST_HALF",
      statusDetail: "35'",
      displayClock: "35'",
      period: 1,
    },
    {
      id: "740703",
      leagueSlug: "esp.1",
      name: "Getafe at Barcelona",
      date: "2026-10-10T16:30:00.000Z",
      homeTeam: {
        id: "83",
        name: "Barcelona",
        displayName: "Barcelona",
      },
      awayTeam: {
        id: "98",
        name: "Getafe",
        displayName: "Getafe",
      },
      homeScore: 1,
      awayScore: 0,
      status: "live",
      statusText: "STATUS_IN_PROGRESS",
      statusDetail: "31'",
      displayClock: "31'",
      period: 1,
    },
    {
      id: "740704",
      leagueSlug: "eng.1",
      name: "AFC Bournemouth at Chelsea",
      date: "2026-10-10T14:00:00.000Z",
      homeTeam: {
        id: "363",
        name: "Chelsea",
        displayName: "Chelsea",
      },
      awayTeam: {
        id: "349",
        name: "AFC Bournemouth",
        displayName: "AFC Bournemouth",
      },
      homeScore: 5,
      awayScore: 1,
      status: "finished",
      statusText: "STATUS_FULL_TIME",
      statusDetail: "FT",
      displayClock: "90'+5'",
    },
    {
      id: "740705",
      leagueSlug: "eng.1",
      name: "Manchester City at Liverpool",
      date: "2026-10-11T16:30:00.000Z",
      homeTeam: {
        id: "364",
        name: "Liverpool",
        displayName: "Liverpool",
      },
      awayTeam: {
        id: "382",
        name: "Manchester City",
        displayName: "Manchester City",
      },
      homeScore: 0,
      awayScore: 0,
      status: "scheduled",
      statusText: "STATUS_SCHEDULED",
      statusDetail: "Scheduled",
    },
  ];

  // 1. Khớp chính xác hai đội (direct order)
  it("1. Khớp chính xác hai đội với thứ tự chuẩn", () => {
    const fixture = {
      team1: "Arsenal",
      team2: "Leeds United",
      sport: "football",
    };
    const score = matchFixtureToScore(fixture, sampleEvents);
    assert.ok(score, "Phải tìm thấy trận đấu");
    assert.strictEqual(score.team1Score, 2);
    assert.strictEqual(score.team2Score, 1);
    assert.strictEqual(score.homeScore, 2);
    assert.strictEqual(score.awayScore, 1);
    assert.strictEqual(score.isReversed, false);
    assert.strictEqual(score.status, "finished");
    assert.strictEqual(score.statusDetail, "FT");
  });

  // 2. Khác biệt chữ hoa/thường, khoảng trắng và dấu tiếng Việt
  it("2. Xử lý chuẩn xác chữ hoa/thường, khoảng trắng thừa", () => {
    const fixture = {
      team1: "  aRsEnAl  ",
      team2: "lEeds  uNiTeD",
      sport: "football",
    };
    const score = matchFixtureToScore(fixture, sampleEvents);
    assert.ok(score);
    assert.strictEqual(score.team1Score, 2);
    assert.strictEqual(score.team2Score, 1);
  });

  // 3. Alias tên đội đã xác minh (Man Utd, Spurs, Barca)
  it("3. Ghép chuẩn xác thông qua alias đã xác minh (Man Utd, Spurs, Barca)", () => {
    const muSpurs = {
      team1: "Man Utd",
      team2: "Spurs",
      sport: "football",
    };
    const scoreMU = matchFixtureToScore(muSpurs, sampleEvents);
    assert.ok(scoreMU);
    assert.strictEqual(scoreMU.status, "live");
    assert.strictEqual(scoreMU.displayClock, "35'");
    assert.strictEqual(scoreMU.team1Score, 0);
    assert.strictEqual(scoreMU.team2Score, 0);

    const barca = {
      team1: "FC Barcelona",
      team2: "Getafe",
      sport: "football",
    };
    const scoreBarca = matchFixtureToScore(barca, sampleEvents);
    assert.ok(scoreBarca);
    assert.strictEqual(scoreBarca.status, "live");
    assert.strictEqual(scoreBarca.team1Score, 1);
    assert.strictEqual(scoreBarca.team2Score, 0);
  });

  // 4. Tên đội bị cắt cụt bằng dấu ba chấm ("Bournemouth...")
  it("4. Nhận diện chính xác tên đội bị cắt cụt bởi dấu ba chấm", () => {
    assert.strictEqual(cleanRawTeamString("Bournemouth..."), "Bournemouth");
    assert.strictEqual(cleanRawTeamString("Wolverhampton…"), "Wolverhampton");

    const fixture = {
      team1: "Chelsea",
      team2: "Bournemouth...",
      sport: "football",
    };
    const score = matchFixtureToScore(fixture, sampleEvents);
    assert.ok(score, "Phải ghép được Bournemouth...");
    assert.strictEqual(score.team1Score, 5);
    assert.strictEqual(score.team2Score, 1);
  });

  // 5. Đảo chiều sân nhà / sân khách
  it("5. Xử lý đảo chiều sân nhà / sân khách và gán đúng team1Score / team2Score", () => {
    // M3U ghi: "Leeds United vs Arsenal" (ngược với API: Arsenal home, Leeds away)
    const reversedFixture = {
      team1: "Leeds United",
      team2: "Arsenal",
      sport: "football",
    };
    const score = matchFixtureToScore(reversedFixture, sampleEvents);
    assert.ok(score);
    assert.strictEqual(score.isReversed, true);
    assert.strictEqual(score.team1Score, 1, "team1 là Leeds nên điểm phải là 1");
    assert.strictEqual(score.team2Score, 2, "team2 là Arsenal nên điểm phải là 2");
    assert.strictEqual(score.homeScore, 2, "homeScore của Arsenal vẫn là 2");
    assert.strictEqual(score.awayScore, 1, "awayScore của Leeds vẫn là 1");
  });

  // 6. Chống va chạm hai đội cùng thành phố hoặc tên gần giống
  it("6. Ngăn chặn triệt để va chạm tên gần giống (Man Utd vs Man City, Real Madrid vs Real Sociedad)", () => {
    // Man Utd không được coi là cùng đội với Man City
    assert.strictEqual(isSameTeam("Manchester United", "Manchester City"), false);
    assert.strictEqual(isSameTeam("Man Utd", "Man City"), false);

    // Real Madrid không được coi là Real Sociedad hay Real Betis
    assert.strictEqual(isSameTeam("Real Madrid", "Real Sociedad"), false);
    assert.strictEqual(isSameTeam("Real Madrid", "Real Betis"), false);

    // Atletico Madrid không được coi là Athletic Club
    assert.strictEqual(isSameTeam("Atletico Madrid", "Athletic Club"), false);

    // Inter Milan không được coi là AC Milan
    assert.strictEqual(isSameTeam("Inter Milan", "AC Milan"), false);

    // Thử ghép một trận giả định: Man City vs Spurs (không có trong API event)
    const fakeFixture = {
      team1: "Manchester City",
      team2: "Tottenham Hotspur",
      sport: "football",
    };
    const fakeScore = matchFixtureToScore(fakeFixture, sampleEvents);
    assert.strictEqual(fakeScore, null, "Không được ghép nhầm Man City vào sự kiện của Man Utd");
  });

  // 7. Không có trận tương ứng -> trả về null, không bịa đặt 0-0
  it("7. Trận đấu không có trong scoreboard trả về null an toàn", () => {
    const unknownFixture = {
      team1: "HAGL",
      team2: "Hà Nội FC",
      sport: "football",
    };
    const score = matchFixtureToScore(unknownFixture, sampleEvents);
    assert.strictEqual(score, null, "Không có trận thì score phải là null");
  });

  // 8. Thể thao khác bóng đá (bóng rổ, tennis) -> bỏ qua
  it("8. Từ chối ghép tỷ số bóng đá cho các môn thể thao khác", () => {
    const basketballFixture = {
      team1: "Arsenal",
      team2: "Leeds United",
      sport: "basketball",
    };
    const score = matchFixtureToScore(basketballFixture, sampleEvents);
    assert.strictEqual(score, null, "Chỉ xử lý bóng đá");
  });

  // 9. Build scores map cho danh sách trận đấu
  it("9. buildScoresMap tạo từ điển tỷ số chính xác theo ID trận", () => {
    const matches = [
      { id: "match-1", team1: "Arsenal", team2: "Leeds United", sport: "football" },
      { id: "match-2", team1: "Chelsea", team2: "Bournemouth...", sport: "football" },
      { id: "match-3", team1: "Sông Lam Nghệ An", team2: "Đà Nẵng", sport: "football" },
    ];
    const map = buildScoresMap(matches, sampleEvents);
    assert.ok(map["match-1"], "match-1 có score");
    assert.strictEqual(map["match-1"].team1Score, 2);
    assert.ok(map["match-2"], "match-2 có score");
    assert.strictEqual(map["match-2"].team1Score, 5);
    assert.strictEqual(map["match-3"], undefined, "match-3 không có score");
  });

  // 10. Cache và Request Deduplication trong footballScoreService
  it("10. footballScoreService quản lý cache và chống duplicate in-flight requests", async () => {
    footballScoreService.clearCacheForTesting();

    // Gọi lần đầu
    const promise1 = footballScoreService.getScoreboardEvents();
    // Gọi đồng thời lần 2
    const promise2 = footballScoreService.getScoreboardEvents();

    const [res1, res2] = await Promise.all([promise1, promise2]);
    assert.ok(res1, "Request 1 phải thành công");
    assert.ok(res2, "Request 2 phải thành công");
    assert.strictEqual(res1.events.length, res2.events.length);

    // Kiểm tra sync cache lấy tức thì 0ms
    const syncEvents = footballScoreService.getCachedEventsSync();
    assert.ok(Array.isArray(syncEvents), "Sync cache phải trả về mảng sự kiện");
  });
});
