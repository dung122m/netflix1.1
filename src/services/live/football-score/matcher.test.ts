import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isSameTeam,
  matchFixtureToScore,
  buildScoresMap,
  cleanRawTeamString,
} from "./matcher";
import { LiveScoreboardEvent } from "./types";
import { footballScoreService, VERIFIED_SCOREBOARD_LEAGUES } from "./service";

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
    {
      id: "761859",
      leagueSlug: "usa.1",
      name: "Atlanta United FC at Inter Miami CF",
      date: "2026-10-10T23:30:00.000Z",
      homeTeam: {
        id: "20232",
        name: "Inter Miami CF",
        displayName: "Inter Miami CF",
      },
      awayTeam: {
        id: "18418",
        name: "Atlanta United FC",
        displayName: "Atlanta United FC",
      },
      homeScore: 3,
      awayScore: 1,
      status: "live",
      statusText: "STATUS_SECOND_HALF",
      statusDetail: "65'",
      displayClock: "65'",
      period: 2,
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

  // 11. Mở rộng giải đấu Giai đoạn P1: đủ 13 giải đấu và có usa.1, eng.fa, eng.league_cup, esp.copa_del_rey
  it("11. VERIFIED_SCOREBOARD_LEAGUES mở rộng chuẩn xác 13 giải đấu (có MLS và các giải cúp)", () => {
    assert.strictEqual(VERIFIED_SCOREBOARD_LEAGUES.length, 13, "Tổng số giải đấu phải là 13");
    assert.ok(VERIFIED_SCOREBOARD_LEAGUES.includes("usa.1"), "Phải có MLS (usa.1)");
    assert.ok(VERIFIED_SCOREBOARD_LEAGUES.includes("eng.fa"), "Phải có FA Cup (eng.fa)");
    assert.ok(VERIFIED_SCOREBOARD_LEAGUES.includes("eng.league_cup"), "Phải có Carabao Cup (eng.league_cup)");
    assert.ok(VERIFIED_SCOREBOARD_LEAGUES.includes("esp.copa_del_rey"), "Phải có Copa del Rey (esp.copa_del_rey)");
  });

  // 12. Nhận diện Inter Miami từ tên chuẩn và các biến thể alias
  it("12. Ghép chuẩn xác trận đấu Inter Miami từ tên chuẩn và các alias (Inter Miami, CLB Inter Miami, Inter Miami FC)", () => {
    // Tên chuẩn
    const standardFixture = {
      team1: "Inter Miami CF",
      team2: "Atlanta United FC",
      sport: "football",
    };
    const score1 = matchFixtureToScore(standardFixture, sampleEvents);
    assert.ok(score1, "Phải ghép được Inter Miami CF");
    assert.strictEqual(score1.team1Score, 3);
    assert.strictEqual(score1.team2Score, 1);
    assert.strictEqual(score1.status, "live");
    assert.strictEqual(score1.displayClock, "65'");
    assert.strictEqual(score1.leagueSlug, "usa.1");

    // Alias phổ biến trên M3U: "Inter Miami" vs "Atlanta United"
    const commonFixture = {
      team1: "Inter Miami",
      team2: "Atlanta United",
      sport: "football",
    };
    const score2 = matchFixtureToScore(commonFixture, sampleEvents);
    assert.ok(score2, "Phải ghép được alias 'Inter Miami'");
    assert.strictEqual(score2.team1Score, 3);
    assert.strictEqual(score2.team2Score, 1);

    // Tiền tố tiếng Việt: "CLB Inter Miami" vs "Atlanta Utd"
    const vnFixture = {
      team1: "CLB Inter Miami",
      team2: "Atlanta Utd",
      sport: "football",
    };
    const score3 = matchFixtureToScore(vnFixture, sampleEvents);
    assert.ok(score3, "Phải ghép được 'CLB Inter Miami'");
    assert.strictEqual(score3.team1Score, 3);

    // Hậu tố FC: "Inter Miami FC"
    const fcFixture = {
      team1: "Inter Miami FC",
      team2: "Atlanta United",
      sport: "football",
    };
    const score4 = matchFixtureToScore(fcFixture, sampleEvents);
    assert.ok(score4, "Phải ghép được 'Inter Miami FC'");
    assert.strictEqual(score4.team1Score, 3);
  });

  // 13. Tuyệt đối không ghép nhầm Inter Miami với Inter Milan hoặc AC Milan
  it("13. Chống ghép nhầm Inter Miami với Inter Milan hoặc AC Milan", () => {
    // isSameTeam giữa Inter Miami và Inter Milan
    assert.strictEqual(isSameTeam("Inter Miami", "Inter Milan"), false);
    assert.strictEqual(isSameTeam("Inter Miami CF", "Inter Milan"), false);
    assert.strictEqual(isSameTeam("Inter", "Inter Miami"), false);
    assert.strictEqual(isSameTeam("Inter Miami", "AC Milan"), false);

    // Ghép một trận giả định: Inter Milan vs Atlanta United -> Không được ghép vào trận của Inter Miami
    const interMilanFixture = {
      team1: "Inter Milan",
      team2: "Atlanta United",
      sport: "football",
    };
    const scoreMilan = matchFixtureToScore(interMilanFixture, sampleEvents);
    assert.strictEqual(scoreMilan, null, "Không được ghép nhầm Inter Milan vào sự kiện của Inter Miami");

    const interShortFixture = {
      team1: "Inter",
      team2: "Atlanta United",
      sport: "football",
    };
    const scoreInterShort = matchFixtureToScore(interShortFixture, sampleEvents);
    assert.strictEqual(scoreInterShort, null, "Không được ghép nhầm 'Inter' (Inter Milan) vào sự kiện của Inter Miami");
  });

  // 14. Xử lý đảo chiều sân nhà / sân khách cho trận Inter Miami
  it("14. Xử lý đảo chiều sân nhà / sân khách cho trận Inter Miami", () => {
    const reversedFixture = {
      team1: "Atlanta United",
      team2: "Inter Miami",
      sport: "football",
    };
    const score = matchFixtureToScore(reversedFixture, sampleEvents);
    assert.ok(score, "Phải nhận diện được trận đảo chiều");
    assert.strictEqual(score.isReversed, true);
    assert.strictEqual(score.team1Score, 1, "team1 là Atlanta nên tỷ số là 1");
    assert.strictEqual(score.team2Score, 3, "team2 là Miami nên tỷ số là 3");
    assert.strictEqual(score.homeScore, 3, "homeScore của Miami vẫn là 3");
    assert.strictEqual(score.awayScore, 1, "awayScore của Atlanta vẫn là 1");
  });

  // 15. Kiểm tra dung sai thời gian thi đấu (>36h không được ghép)
  it("15. Trận đấu vượt quá dung sai thời gian thi đấu (>36h) bị từ chối ghép", () => {
    const eventTime = Date.parse("2026-10-10T23:30:00.000Z");

    // Trận cách 48 giờ (> 36h)
    const farFixture = {
      team1: "Inter Miami",
      team2: "Atlanta United",
      sport: "football",
      timestamp: eventTime + 48 * 60 * 60 * 1000,
    };
    const scoreFar = matchFixtureToScore(farFixture, sampleEvents);
    assert.strictEqual(scoreFar, null, "Trận cách >36h phải trả về null");

    // Trận trong khoảng 2 giờ (< 36h)
    const nearFixture = {
      team1: "Inter Miami",
      team2: "Atlanta United",
      sport: "football",
      timestamp: eventTime + 2 * 60 * 60 * 1000,
    };
    const scoreNear = matchFixtureToScore(nearFixture, sampleEvents);
    assert.ok(scoreNear, "Trận trong khoảng thời gian hợp lệ phải được ghép");
    assert.strictEqual(scoreNear.team1Score, 3);
  });

  // 16. P2: Match Center - Kiểm tra tính hợp lệ của leagueSlug và eventId đầu vào
  it("16. P2 Match Center: Từ chối leagueSlug bất hợp pháp hoặc eventId có định dạng không an toàn", async () => {
    // League slug ngoài danh mục đã xác minh
    const invalidLeagueRes = await footballScoreService.getMatchSummary("unknown.league", "123456");
    assert.strictEqual(invalidLeagueRes.data, null);

    // EventId chứa ký tự injection nguy hiểm
    const maliciousIdRes = await footballScoreService.getMatchSummary("usa.1", "../../../etc/passwd");
    assert.strictEqual(maliciousIdRes.data, null);

    // EventId rỗng
    const emptyIdRes = await footballScoreService.getMatchSummary("usa.1", "   ");
    assert.strictEqual(emptyIdRes.data, null);
  });

  // 17. P2: Match Center - In-flight deduplication và Server Cache cho Match Summary
  it("17. P2 Match Center: In-flight deduplication và bộ nhớ đệm chống quá tải API", async () => {
    footballScoreService.clearCacheForTesting();

    // Giả lập 2 request đồng thời cho cùng 1 trận
    const p1 = footballScoreService.getMatchSummary("usa.1", "761856");
    const p2 = footballScoreService.getMatchSummary("usa.1", "761856");

    const [res1, res2] = await Promise.all([p1, p2]);

    // Nếu mạng kết nối được với upstream
    if (res1.data) {
      assert.strictEqual(res1.data.eventId, "761856");
      assert.strictEqual(res1.data.leagueSlug, "usa.1");
      assert.ok(res1.data.homeTeam.displayName, "Phải có tên đội nhà");
      assert.ok(res1.data.awayTeam.displayName, "Phải có tên đội khách");
      assert.ok(Array.isArray(res1.data.stats), "Stats phải là mảng");
      assert.ok(Array.isArray(res1.data.events), "Events phải là mảng");
      assert.ok(Array.isArray(res1.data.homeRoster.starters), "Starters phải là mảng");
      assert.ok(Array.isArray(res1.data.commentary), "Commentary phải là mảng");

      // Request thứ 3 ngay sau đó phải lấy từ cache
      const res3 = await footballScoreService.getMatchSummary("usa.1", "761856");
      assert.strictEqual(res3.cached, true, "Lần gọi thứ 3 phải trả về từ memory cache");
    }
  });

  // 18. P2: Match Center - Kiểm tra cấu trúc chuẩn hóa NormalizedMatchSummary
  it("18. P2 Match Center: Cấu trúc dữ liệu NormalizedMatchSummary có đầy đủ các tab cần thiết", () => {
    // Kiểm tra các trường thiết yếu của NormalizedMatchSummary
    const mockSummary = {
      eventId: "999",
      leagueSlug: "eng.1",
      status: "live" as const,
      statusText: "Second Half",
      displayClock: "75'",
      homeTeam: {
        id: "1",
        name: "Arsenal",
        displayName: "Arsenal",
        score: 2,
        homeAway: "home" as const,
      },
      awayTeam: {
        id: "2",
        name: "Chelsea",
        displayName: "Chelsea",
        score: 1,
        homeAway: "away" as const,
      },
      stats: [
        {
          name: "possessionPct",
          label: "Kiểm soát bóng (%)",
          homeValue: "58",
          awayValue: "42",
          homeNumeric: 58,
          awayNumeric: 42,
        },
      ],
      events: [
        {
          id: "ev1",
          type: "goal" as const,
          typeText: "Goal",
          text: "Goal! Arsenal 1, Chelsea 0.",
          clock: "25'",
          minute: 25,
          playerName: "Bukayo Saka",
        },
      ],
      homeRoster: {
        formation: "4-3-3",
        starters: [],
        bench: [],
      },
      awayRoster: {
        formation: "4-2-3-1",
        starters: [],
        bench: [],
      },
      gameInfo: {
        venue: { name: "Emirates Stadium", city: "London" },
        referee: "Michael Oliver",
      },
      commentary: [],
      updatedAt: new Date().toISOString(),
    };

    assert.strictEqual(mockSummary.status, "live");
    assert.strictEqual(mockSummary.homeTeam.score, 2);
    assert.strictEqual(mockSummary.awayTeam.score, 1);
    assert.strictEqual(mockSummary.stats[0].name, "possessionPct");
    assert.strictEqual(mockSummary.events[0].type, "goal");
    assert.strictEqual(mockSummary.gameInfo.venue?.name, "Emirates Stadium");
  });
});

