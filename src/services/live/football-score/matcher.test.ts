import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isSameTeam,
  matchFixtureToScore,
  buildScoresMap,
  cleanRawTeamString,
} from "./matcher";
import { LiveScoreboardEvent, LiveMatchScore } from "./types";
import { footballScoreService, VERIFIED_SCOREBOARD_LEAGUES } from "./service";
import { resolveCanonicalTournament, LEAGUE_CANONICAL_MAP } from "./canonicalLeagues";
import { resolveMatchDisplayStatus, formatKickoffTime } from "./liveStatus";
import { normalizeAndMergeStreams, RawStreamItem } from "../football/service";

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

  // 11. Mở rộng giải đấu Giai đoạn P1 & P2: đủ 16 giải đấu đã xác minh (bao gồm 3 cúp UEFA)
  it("11. VERIFIED_SCOREBOARD_LEAGUES mở rộng chuẩn xác 16 giải đấu (có MLS, UEFA C1/C2/C3 và các giải cúp)", () => {
    assert.strictEqual(VERIFIED_SCOREBOARD_LEAGUES.length, 16, "Tổng số giải đấu phải là 16");
    assert.ok(VERIFIED_SCOREBOARD_LEAGUES.includes("usa.1"), "Phải có MLS (usa.1)");
    assert.ok(VERIFIED_SCOREBOARD_LEAGUES.includes("uefa.champions"), "Phải có UEFA Champions League (uefa.champions)");
    assert.ok(VERIFIED_SCOREBOARD_LEAGUES.includes("uefa.europa"), "Phải có UEFA Europa League (uefa.europa)");
    assert.ok(VERIFIED_SCOREBOARD_LEAGUES.includes("uefa.europa.conf"), "Phải có UEFA Conference League (uefa.europa.conf)");
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
    assert.ok(res2, "Request trùng lặp in-flight phải trả về kết quả");

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

  // 18. matchFixtureToScore trích xuất kickoffTime và kickoffTimestamp chuẩn xác từ ev.date
  it("18. matchFixtureToScore trích xuất kickoffTime và kickoffTimestamp theo múi giờ Việt Nam", () => {
    const fixture = {
      team1: "Arsenal",
      team2: "Leeds United",
      sport: "football",
    };
    const score = matchFixtureToScore(fixture, sampleEvents);
    assert.ok(score, "Phải ghép được trận Arsenal vs Leeds");
    assert.ok(score.kickoffTimestamp, "Phải có kickoffTimestamp");
    assert.strictEqual(score.kickoffTimestamp, Date.parse("2026-10-10T11:30:00.000Z"));
    // 11:30 UTC = 18:30 GMT+7
    assert.strictEqual(score.kickoffTime, "18:30");
  });

  // 19. resolveCanonicalTournament phân loại 4 tầng, loại bỏ nhãn playlist và emoji lỗi
  it("19. resolveCanonicalTournament chuẩn hóa tên giải: loại bỏ cờ lỗi, loại bỏ nhãn playlist, dùng leagueSlug khi có score", () => {
    // Tầng 1: Ưu tiên score.leagueSlug đã xác minh
    const t1 = resolveCanonicalTournament({
      tournament: "Bóng Đá Trực Tiếp",
      title: "Real Madrid vs Barcelona",
      score: {
        eventId: "1",
        leagueSlug: "esp.1",
        team1Score: 2,
        team2Score: 1,
        homeScore: 2,
        awayScore: 1,
        isReversed: false,
        status: "live",
        updatedAt: new Date().toISOString(),
      },
    });
    assert.strictEqual(t1, "La Liga", "Phải lấy đúng La Liga từ leagueSlug esp.1");

    // Tầng 2: Sửa chuỗi bị lỗi font Unicode Windows (es La Liga -> La Liga, it Serie A -> Serie A)
    const tLaLiga = resolveCanonicalTournament({
      tournament: "es La Liga",
      title: "Real Betis vs Celta Vigo",
    });
    assert.strictEqual(tLaLiga, "La Liga", "Phải làm sạch tiền tố 'es ' thành 'La Liga'");

    const tSerieA = resolveCanonicalTournament({
      tournament: "it Serie A",
      title: "Juventus vs Roma",
    });
    assert.strictEqual(tSerieA, "Serie A", "Phải làm sạch tiền tố 'it ' thành 'Serie A'");

    // UEFA Champions League từ title
    const tUcl = resolveCanonicalTournament({
      tournament: "Trực Tiếp Cúp C1",
      title: "PSG vs Bayern Munich | Champions League",
    });
    assert.strictEqual(tUcl, "UEFA Champions League");

    // Loại bỏ hoàn toàn nhãn playlist chung và gom vào "Giải Đấu Khác"
    const tGeneric1 = resolveCanonicalTournament({
      tournament: "Bóng Đá Trực Tiếp",
      title: "Trận Đấu Không Rõ",
      sport: "football",
    });
    assert.strictEqual(tGeneric1, "Giải Đấu Khác", "Bóng Đá Trực Tiếp phải gom vào Giải Đấu Khác");

    const tGeneric2 = resolveCanonicalTournament({
      tournament: "COLA TV",
      title: "Trận Đấu Cola",
      sport: "football",
    });
    assert.strictEqual(tGeneric2, "Giải Đấu Khác", "COLA TV phải gom vào Giải Đấu Khác");
  });

  // 20. Trận mơ hồ hoặc không đủ tin cậy bị từ chối ghép
  it("20. matchFixtureToScore từ chối ghép khi có nhiều ứng viên trùng lặp mà không có timestamp để phân định", () => {
    const ambiguousEvents: LiveScoreboardEvent[] = [
      {
        id: "ev_1",
        leagueSlug: "eng.1",
        name: "Arsenal at Chelsea",
        date: "2026-10-10T12:00:00.000Z",
        homeTeam: { id: "1", name: "Chelsea", displayName: "Chelsea" },
        awayTeam: { id: "2", name: "Arsenal", displayName: "Arsenal" },
        homeScore: 1,
        awayScore: 0,
        status: "finished",
        statusText: "STATUS_FULL_TIME",
        statusDetail: "FT",
      },
      {
        id: "ev_2",
        leagueSlug: "eng.fa",
        name: "Arsenal at Chelsea",
        date: "2026-10-10T13:00:00.000Z",
        homeTeam: { id: "1", name: "Chelsea", displayName: "Chelsea" },
        awayTeam: { id: "2", name: "Arsenal", displayName: "Arsenal" },
        homeScore: 2,
        awayScore: 2,
        status: "live",
        statusText: "STATUS_IN_PROGRESS",
        statusDetail: "60'",
      },
    ];

    // Không có timestamp -> mơ hồ không biết trận nào -> trả về null
    const noTimestampFixture = {
      team1: "Chelsea",
      team2: "Arsenal",
      sport: "football",
    };
    const res = matchFixtureToScore(noTimestampFixture, ambiguousEvents);
    assert.strictEqual(res, null, "Không được tự đoán trận khi có nhiều ứng viên mà không có timestamp");
  });

  // 21. M3U chỉ có "Trực tiếp", scoreboard có kickoff
  it("21. M3U chỉ có 'Trực tiếp' (sentinel MAX_SAFE_INTEGER), scoreboard có kickoff: khôi phục kickoff chuẩn", () => {
    const fixtureWithLiveMarker = {
      id: "m_live_1",
      team1: "Arsenal",
      team2: "Leeds United",
      sport: "football",
      timestamp: Number.MAX_SAFE_INTEGER,
    };
    const score = matchFixtureToScore(fixtureWithLiveMarker, sampleEvents);
    assert.ok(score, "Phải ghép thành công với event Arsenal vs Leeds");
    assert.strictEqual(score?.kickoffTime, "18:30", "Giờ kickoff phải là 18:30 theo giờ VN");
    assert.strictEqual(score?.kickoffIso, "2026-10-10T11:30:00.000Z");
    assert.ok(score?.kickoffTimestamp && score.kickoffTimestamp > 0);

    // Kiểm tra tầng hiển thị qua resolveMatchDisplayStatus
    const display = resolveMatchDisplayStatus({
      timestamp: Number.MAX_SAFE_INTEGER,
      score,
    });
    assert.strictEqual(display.kickoffTime, "18:30", "Tầng hiển thị phải giữ giờ kickoff 18:30");
  });

  // 22. Nguồn M3U thứ nhất không có giờ ("Trực tiếp"), nguồn thứ hai có HH:mm -> merge không làm mất giờ hợp lệ
  it("22. Nguồn M3U thứ nhất không có giờ, nguồn thứ hai có HH:mm -> merge giữ nguyên HH:mm", () => {
    const matchNow = new Date("2026-09-26T21:30:00+07:00").getTime();
    const rawStreams = [
      {
        channel: "Kênh 1",
        rawTitle: "[TRỰC TIẾP] Arsenal vs Leeds United",
        group: "Bóng đá trực tiếp",
        rawLogo: "",
        effectiveUrl: "http://stream1.m3u8",
      },
      {
        channel: "Kênh 2",
        rawTitle: "21:30 26/09 Arsenal vs Leeds United (BLV Batman)",
        group: "Bóng đá trực tiếp",
        rawLogo: "",
        effectiveUrl: "http://stream2.m3u8",
      },
    ];
    const { matches } = normalizeAndMergeStreams(rawStreams as unknown as RawStreamItem[], matchNow);
    assert.strictEqual(matches.length, 1, "Phải gộp thành 1 thẻ trận");
    assert.ok(matches[0].time.startsWith("21:30"), "Phải ưu tiên giờ 21:30 thay vì 'Trực tiếp'");
    assert.notStrictEqual(matches[0].timestamp, Number.MAX_SAFE_INTEGER, "Timestamp phải là giờ thực");
  });

  // 23. Nguồn M3U thứ nhất có giờ, nguồn thứ hai 'Trực tiếp' -> không bị ghi đè
  it("23. Merge không ghi đè giờ hợp lệ bằng 'Trực tiếp' hay sentinel", () => {
    const matchNow = new Date("2026-09-26T20:00:00+07:00").getTime();
    const rawStreams = [
      {
        channel: "Kênh 1",
        rawTitle: "20:00 26/09 Chelsea vs Bournemouth",
        group: "Bóng đá",
        rawLogo: "",
        effectiveUrl: "http://stream1.m3u8",
      },
      {
        channel: "Kênh 2",
        rawTitle: "[TRỰC TIẾP] Chelsea vs Bournemouth",
        group: "Bóng đá trực tiếp",
        rawLogo: "",
        effectiveUrl: "http://stream2.m3u8",
      },
    ];
    const { matches } = normalizeAndMergeStreams(rawStreams as unknown as RawStreamItem[], matchNow);
    assert.strictEqual(matches.length, 1);
    assert.ok(matches[0].time.startsWith("20:00"), "Không được ghi đè 20:00 bằng 'Trực tiếp'");
  });

  // 24. Trận không match được API vẫn hiển thị giờ M3U nếu hợp lệ
  it("24. Trận không match được API vẫn hiển thị giờ M3U nếu hợp lệ", () => {
    const validKickoffTs = new Date("2026-10-10T20:00:00+07:00").getTime();
    const display = resolveMatchDisplayStatus({
      timestamp: validKickoffTs,
      score: null, // Không có livescore
    });
    assert.strictEqual(display.kickoffTime, "20:00");
    assert.strictEqual(display.statusType, "upcoming");
  });

  // 25. Timestamp ISO có Z được chuyển chính xác sang giờ Việt Nam, kể cả khi qua ngày
  it("25. Timestamp ISO có 'Z' được chuyển chính xác sang giờ Việt Nam, kể cả khi qua ngày", () => {
    // 17:15Z ngày 10/10 -> 00:15 ngày 11/10 tại VN (+7)
    const midnightIsoTs = Date.parse("2026-10-10T17:15:00.000Z");
    assert.strictEqual(formatKickoffTime(midnightIsoTs), "00:15");

    // 23:45Z ngày 10/10 -> 06:45 ngày 11/10 tại VN (+7)
    const nextDayMorningTs = Date.parse("2026-10-10T23:45:00.000Z");
    assert.strictEqual(formatKickoffTime(nextDayMorningTs), "06:45");
  });

  // 26. API không có ngày giờ hợp lệ: không tự tạo kickoff giả
  it("26. API không có ngày giờ hợp lệ: không tự tạo kickoff giả", () => {
    const eventWithoutDate: LiveScoreboardEvent = {
      id: "ev_no_date",
      leagueSlug: "eng.1",
      name: "Manchester United vs Liverpool",
      date: "", // rỗng
      homeTeam: { id: "1", name: "Liverpool", displayName: "Liverpool" },
      awayTeam: { id: "2", name: "Manchester United", displayName: "Manchester United" },
      homeScore: 0,
      awayScore: 0,
      status: "scheduled",
      statusText: "STATUS_SCHEDULED",
    };
    const fixture = {
      team1: "Liverpool",
      team2: "Manchester United",
      sport: "football",
    };
    const score = matchFixtureToScore(fixture, [eventWithoutDate]);
    assert.ok(score);
    assert.strictEqual(score?.kickoffTime, undefined, "Không được tự tạo kickoffTime khi API thiếu date");
    assert.strictEqual(score?.kickoffTimestamp, undefined, "Không được tự tạo kickoffTimestamp khi API thiếu date");

    const display = resolveMatchDisplayStatus({
      timestamp: undefined,
      score,
    });
    assert.strictEqual(display.kickoffTime, null, "Display layer không được tự tạo kickoff giả");
  });

  // 27. Tên giải từ scoreboard thống nhất với nhãn bộ lọc
  it("27. Tên giải từ scoreboard thống nhất tuyệt đối với từ điển giải đấu", () => {
    for (const slug of VERIFIED_SCOREBOARD_LEAGUES) {
      const canonical = resolveCanonicalTournament({
        score: { leagueSlug: slug } as unknown as LiveMatchScore,
      });
      assert.strictEqual(
        canonical,
        LEAGUE_CANONICAL_MAP[slug],
        `League slug ${slug} phải trả về tên chuẩn ${LEAGUE_CANONICAL_MAP[slug]}`,
      );
    }
  });

  // 28. Trận không xác định được giải đấu không suy đoán từ 1 đội (vd CD Nacional) và không dùng BLV làm giải đấu
  it("28. Trận không xác định được giải đấu dùng 'Giải Đấu Khác', không đoán từ 1 đội và không dùng tên BLV", () => {
    const tour1 = resolveCanonicalTournament({
      title: "CD Nacional vs FC Porto",
      tournament: "",
      team1: "CD Nacional",
      team2: "FC Porto",
      score: null,
    });
    assert.strictEqual(tour1, "Giải Đấu Khác", "Không được suy đoán thành Giải Nam Mỹ chỉ vì tên có Nacional");

    const tourBlv = resolveCanonicalTournament({
      title: "Trận Đấu Kịch Tính",
      tournament: "BLV Batman",
      score: null,
    });
    assert.strictEqual(tourBlv, "Giải Đấu Khác", "Không được dùng tên BLV làm giải đấu");

    const tourCommentator = resolveCanonicalTournament({
      title: "Trận Đấu Căng Thẳng",
      tournament: "Bình luận viên Captain",
      score: null,
    });
    assert.strictEqual(tourCommentator, "Giải Đấu Khác", "Không được dùng Bình luận viên làm giải đấu");
  });

  // 29. Nhận diện tên giải đấu rõ ràng bằng chữ không phụ thuộc logo
  it("29. Nhận diện tên giải đấu rõ ràng bằng chữ: Premier League, La Liga, UEFA Champions League, NBA", () => {
    assert.strictEqual(
      resolveCanonicalTournament({ title: "Arsenal vs Chelsea (Premier League)" }),
      "Ngoại Hạng Anh",
    );
    assert.strictEqual(
      resolveCanonicalTournament({ title: "Barcelona vs Real Madrid (La Liga)" }),
      "La Liga",
    );
    assert.strictEqual(
      resolveCanonicalTournament({ title: "Bayern vs PSG (UEFA Champions League)" }),
      "UEFA Champions League",
    );
    assert.strictEqual(
      resolveCanonicalTournament({ title: "Los Angeles Lakers vs Golden State Warriors (NBA)" }),
      "Giải Bóng Rổ NBA",
    );
  });

  // 30. Trận thể thao bóng rổ trả về fallback bộ môn khi không có giải đấu rõ ràng
  it("30. Trận có sport='basketball' và không có tên giải thô trả về 'Bóng Rổ'", () => {
    const res = resolveCanonicalTournament({
      title: "Hà Nội Buffaloes vs Saigon Heat",
      sport: "basketball",
      tournament: "",
    });
    assert.strictEqual(res, "Bóng Rổ", "Trận bóng rổ không có tên giải phải trả về Bóng Rổ");
  });
});

