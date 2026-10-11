import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTeamKey,
  resolveTeamLogo,
  isTeamIdentityMatch,
  STATIC_CLUB_LOGOS,
  LOGO_CACHE,
} from "./service";
import { parseRawSummary } from "@/services/live/football-score/service";

describe("Nanaflix /live - Team Logo Normalization & Identity Verification", () => {
  // 1. normalizeTeamKey("Manchester City") và normalizeTeamKey("Manchester United") không bị gộp thành cùng key
  it("1. normalizeTeamKey('Manchester City') và normalizeTeamKey('Manchester United') có key riêng biệt", () => {
    const keyCity = normalizeTeamKey("Manchester City");
    const keyUtd = normalizeTeamKey("Manchester United");
    assert.notEqual(keyCity, keyUtd, "Manchester City và Manchester United không được trùng key");
    assert.equal(keyCity, "manchestercity");
    assert.equal(keyUtd, "manchesterunited");
  });

  // 2. Sheffield United khác Sheffield Wednesday
  it("2. Sheffield United khác Sheffield Wednesday", () => {
    const keyUtd = normalizeTeamKey("Sheffield United");
    const keyWed = normalizeTeamKey("Sheffield Wednesday");
    assert.notEqual(keyUtd, keyWed, "Sheffield United và Sheffield Wednesday phải khác key");
    assert.equal(keyUtd, "sheffieldunited");
    assert.equal(keyWed, "sheffieldwednesday");
  });

  // 3. Manchester City không bao giờ nhận badge của Manchester 62
  it("3. Manchester City không bao giờ nhận badge của Manchester 62", () => {
    const isMatch = isTeamIdentityMatch("Manchester City", {
      strTeam: "Manchester 62",
      strTeamShort: "MAN62",
      strAlternate: "FC Manchester 62",
    });
    assert.equal(isMatch, false, "Manchester City không được match với Manchester 62");

    const isMatchReverse = isTeamIdentityMatch("Manchester 62", {
      strTeam: "Manchester City",
      strTeamShort: "MCI",
    });
    assert.equal(isMatchReverse, false, "Manchester 62 không được match với Manchester City");
  });

  // 4. Manchester United được ánh xạ đúng logo ESPN team ID 360
  it("4. Manchester United được ánh xạ đúng logo ESPN team ID 360", async () => {
    const logo = await resolveTeamLogo("Manchester United");
    assert.ok(logo.includes("/360.png"), "Manchester United phải dùng ESPN ID 360");
    assert.equal(logo, "https://a.espncdn.com/i/teamlogos/soccer/500/360.png");

    const logoAlias = await resolveTeamLogo("Man Utd");
    assert.equal(logoAlias, "https://a.espncdn.com/i/teamlogos/soccer/500/360.png");
  });

  // 5. Manchester City được ánh xạ đúng logo ESPN team ID 382
  it("5. Manchester City được ánh xạ đúng logo ESPN team ID 382", async () => {
    const logo = await resolveTeamLogo("Manchester City");
    assert.ok(logo.includes("/382.png"), "Manchester City phải dùng ESPN ID 382");
    assert.equal(logo, "https://a.espncdn.com/i/teamlogos/soccer/500/382.png");

    const logoAlias = await resolveTeamLogo("Man City");
    assert.equal(logoAlias, "https://a.espncdn.com/i/teamlogos/soccer/500/382.png");
  });

  // 6. Bristol City không bị nhầm với đội có tên chỉ là Bristol
  it("6. Bristol City không bị nhầm với đội có tên chỉ là Bristol", () => {
    const keyCity = normalizeTeamKey("Bristol City");
    const keyBristol = normalizeTeamKey("Bristol");
    assert.notEqual(keyCity, keyBristol, "Bristol City và Bristol phải khác key");
    assert.equal(keyCity, "bristolcity");
    assert.equal(keyBristol, "bristol");

    assert.equal(
      isTeamIdentityMatch("Bristol City", { strTeam: "Bristol" }),
      false,
      "Bristol City không match với Bristol",
    );
    assert.equal(
      isTeamIdentityMatch("Bristol", { strTeam: "Bristol City" }),
      false,
      "Bristol không match với Bristol City",
    );
    assert.equal(
      isTeamIdentityMatch("Bristol City", { strTeam: "Bristol Rovers" }),
      false,
      "Bristol City không match với Bristol Rovers",
    );
  });

  // 7. parseRawSummary đọc được team.logos[0].href, đồng thời xử lý an toàn khi logos rỗng hoặc thiếu
  it("7. parseRawSummary đọc được team.logos[0].href và xử lý an toàn khi thiếu logos", () => {
    // 7A: Payload có team.logos[0].href (schema ESPN thực tế)
    const rawEspn = {
      header: {
        competitions: [
          {
            status: { type: { name: "STATUS_IN_PROGRESS", state: "in" }, displayClock: "64'" },
            competitors: [
              {
                id: "382",
                homeAway: "home",
                score: "2",
                team: {
                  id: "382",
                  displayName: "Manchester City",
                  abbreviation: "MCI",
                  logos: [
                    { href: "https://a.espncdn.com/i/teamlogos/soccer/500/382.png", width: 500, height: 500 },
                  ],
                },
              },
              {
                id: "360",
                homeAway: "away",
                score: "1",
                team: {
                  id: "360",
                  displayName: "Manchester United",
                  abbreviation: "MUN",
                  logos: [
                    { href: "https://a.espncdn.com/i/teamlogos/soccer/500/360.png", width: 500, height: 500 },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    const summaryEspn = parseRawSummary("eng.1", "740700", rawEspn);
    assert.ok(summaryEspn);
    assert.equal(summaryEspn?.homeTeam?.logo, "https://a.espncdn.com/i/teamlogos/soccer/500/382.png");
    assert.equal(summaryEspn?.awayTeam?.logo, "https://a.espncdn.com/i/teamlogos/soccer/500/360.png");

    // 7B: Payload khi logos rỗng hoặc thiếu
    const rawNoLogos = {
      header: {
        competitions: [
          {
            status: { type: { name: "STATUS_SCHEDULED", state: "pre" } },
            competitors: [
              {
                id: "1",
                homeAway: "home",
                team: { id: "1", displayName: "Team A", logos: [] },
              },
              {
                id: "2",
                homeAway: "away",
                team: { id: "2", displayName: "Team B" },
              },
            ],
          },
        ],
      },
    };

    const summaryNoLogos = parseRawSummary("eng.1", "740701", rawNoLogos);
    assert.ok(summaryNoLogos);
    assert.equal(summaryNoLogos?.homeTeam?.logo, "");
    assert.equal(summaryNoLogos?.awayTeam?.logo, "");

    // 7C: Fallback schema cũ (team.logo trực tiếp)
    const rawLegacy = {
      header: {
        competitions: [
          {
            status: { type: { name: "STATUS_FINAL", state: "post" } },
            competitors: [
              {
                id: "1",
                homeAway: "home",
                team: { id: "1", displayName: "Legacy Home", logo: "https://legacy.example.com/logo1.png" },
              },
              {
                id: "2",
                homeAway: "away",
                team: { id: "2", displayName: "Legacy Away", logo: "https://legacy.example.com/logo2.png" },
              },
            ],
          },
        ],
      },
    };

    const summaryLegacy = parseRawSummary("eng.1", "740702", rawLegacy);
    assert.ok(summaryLegacy);
    assert.equal(summaryLegacy?.homeTeam?.logo, "https://legacy.example.com/logo1.png");
    assert.equal(summaryLegacy?.awayTeam?.logo, "https://legacy.example.com/logo2.png");
  });

  // 8. Kết quả tra cứu mơ hồ không được cache thành mapping sai
  it("8. Kết quả tra cứu mơ hồ không được cache thành mapping sai", async () => {
    const unknownTeam = "NonExistent FC Fantasy 12345";
    const unknownKey = normalizeTeamKey(unknownTeam);

    const logo = await resolveTeamLogo(unknownTeam);
    assert.equal(logo, "", "Đội không tồn tại/mơ hồ phải trả về chuỗi rỗng");
    assert.equal(LOGO_CACHE.get(unknownKey), "", "Cache phải lưu chuỗi rỗng để tránh gán nhầm");

    // Đảm bảo Manchester City không bị ảnh hưởng bởi cache của đội khác
    assert.equal(STATIC_CLUB_LOGOS["manchestercity"], "https://a.espncdn.com/i/teamlogos/soccer/500/382.png");
  });
});
