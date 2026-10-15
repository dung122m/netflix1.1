import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateTacticalCoordinates,
  getPositionAbbreviation,
  getShortDisplayName,
  VectorJerseyToken,
  CircularBadgeToken,
  translatePosition,
  translateStatName,
} from "@/components/live/TacticalLineup";
import { MatchRosterPlayer } from "./types";
import { parseRawSummary } from "./service";

function createMockPlayer(
  id: string,
  name: string,
  position: string,
  jersey: string,
  starter = true,
  formationPlace?: number,
  photoUrl?: string
): MatchRosterPlayer {
  return {
    id,
    name,
    displayName: name,
    jersey,
    position,
    starter,
    formationPlace,
    photoUrl,
  };
}

describe("Tactical Lineup & Pitch Coordinate System", () => {
  it("1. calculateTacticalCoordinates với sơ đồ 4-3-3: đủ 11 cầu thủ không bị thiếu hoặc trùng", () => {
    const starters: MatchRosterPlayer[] = [
      createMockPlayer("1", "David Raya", "Goalkeeper", "22", true, 1),
      createMockPlayer("2", "Jurriën Timber", "Right Back", "12", true, 2, "https://example.com/timber.png"),
      createMockPlayer("3", "William Saliba", "Center Right Defender", "2", true, 5),
      createMockPlayer("4", "Gabriel Magalhães", "Center Left Defender", "6", true, 6),
      createMockPlayer("5", "Myles Lewis-Skelly", "Left Back", "49", true, 3),
      createMockPlayer("6", "Thomas Partey", "Center Midfielder", "5", true, 4),
      createMockPlayer("7", "Martin Ødegaard", "Right Midfielder", "8", true, 7),
      createMockPlayer("8", "Declan Rice", "Left Midfielder", "41", true, 8),
      createMockPlayer("9", "Ethan Nwaneri", "Right Forward", "53", true, 10),
      createMockPlayer("10", "Leandro Trossard", "Forward", "19", true, 9),
      createMockPlayer("11", "Raheem Sterling", "Left Forward", "30", true, 11),
    ];

    const positioned = calculateTacticalCoordinates(starters, "4-3-3");

    // Đủ 11 cầu thủ
    assert.strictEqual(positioned.length, 11, "Phải định vị chính xác 11 cầu thủ đá chính");

    // Tất cả ID phải xuất hiện duy nhất một lần
    const ids = positioned.map((p) => p.player.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(uniqueIds.size, 11, "Không có cầu thủ nào bị trùng lặp ID");

    // Thủ môn ở đáy sân
    const gk = positioned.find((p) => p.player.id === "1");
    assert.ok(gk);
    assert.strictEqual(gk.roleAbbr, "GK");
    assert.strictEqual(gk.x, 50, "Thủ môn phải ở chính giữa trục X");
    assert.strictEqual(gk.y, 89, "Thủ môn phải ở khu vực cầu môn đáy sân");

    // Tất cả tọa độ phải nằm an toàn trong khung sân (0..100)
    for (const p of positioned) {
      assert.ok(p.x >= 10 && p.x <= 90, `Tọa độ X (${p.x}) phải nằm trong sân`);
      assert.ok(p.y >= 10 && p.y <= 90, `Tọa độ Y (${p.y}) phải nằm trong sân`);
    }

    // Cầu thủ có ảnh thật phải bảo toàn photoUrl
    const timber = positioned.find((p) => p.player.id === "2");
    assert.ok(timber);
    assert.strictEqual(timber.player.photoUrl, "https://example.com/timber.png");
  });

  it("2. calculateTacticalCoordinates với sơ đồ 4-2-3-1 (Leicester City): phân 4 tuyến chuẩn", () => {
    const starters: MatchRosterPlayer[] = [
      createMockPlayer("1", "Mads Hermansen", "Goalkeeper", "30", true, 1),
      createMockPlayer("2", "James Justin", "Right Back", "2", true, 2),
      createMockPlayer("3", "Wout Faes", "Center Right Defender", "3", true, 5),
      createMockPlayer("4", "Caleb Okoli", "Center Left Defender", "5", true, 6),
      createMockPlayer("5", "Victor Kristiansen", "Left Back", "16", true, 3),
      createMockPlayer("6", "Boubakary Soumaré", "Left Midfielder", "24", true, 4),
      createMockPlayer("7", "Wilfred Ndidi", "Right Midfielder", "6", true, 8),
      createMockPlayer("8", "Bobby De Cordova-Reid", "Attacking Midfielder Right", "14", true, 7),
      createMockPlayer("9", "Bilal El Khannouss", "Attacking Midfielder", "11", true, 10),
      createMockPlayer("10", "Jordan Ayew", "Attacking Midfielder Left", "18", true, 11),
      createMockPlayer("11", "Jamie Vardy", "Forward", "9", true, 9),
    ];

    const positioned = calculateTacticalCoordinates(starters, "4-2-3-1");

    assert.strictEqual(positioned.length, 11);

    // Tiền đạo cắm (Jamie Vardy) ở cao nhất (Y nhỏ nhất ~16%)
    const vardy = positioned.find((p) => p.player.id === "11");
    assert.ok(vardy);
    assert.strictEqual(vardy.y, 16, "Tiền đạo cắm phải ở tuyến cao nhất");
    assert.strictEqual(vardy.x, 50, "Tiền đạo cắm duy nhất ở chính diện khung thành");
  });

  it("3. calculateTacticalCoordinates với sơ đồ 3-4-3 (FC Utrecht) và 3-5-2", () => {
    const starters343: MatchRosterPlayer[] = [
      createMockPlayer("1", "Vasilios Barkas", "Goalkeeper", "1", true, 1),
      createMockPlayer("2", "Siebe Horemans", "Center Right Defender", "2", true),
      createMockPlayer("3", "Matisse Didden", "Center Defender", "3", true),
      createMockPlayer("4", "Nikolas Panagiotou", "Center Left Defender", "5", true),
      createMockPlayer("5", "Niklas Vesterlund", "Right Midfielder", "23", true),
      createMockPlayer("6", "Joris van Overeem", "Center Right Midfielder", "8", true),
      createMockPlayer("7", "Oualid Agougil", "Center Left Midfielder", "38", true),
      createMockPlayer("8", "Arthur Zagre", "Left Midfielder", "92", true),
      createMockPlayer("9", "Marius Broholm", "Center Right Forward", "80", true),
      createMockPlayer("10", "Dani de Wit", "Forward", "20", true),
      createMockPlayer("11", "Yoann Cathline", "Center Left Forward", "10", true),
    ];

    const pos343 = calculateTacticalCoordinates(starters343, "3-4-3");
    assert.strictEqual(pos343.length, 11);

    // Hàng thủ 3 người
    const defs = pos343.filter((p) => p.y === 70);
    assert.strictEqual(defs.length, 3, "Hàng thủ 3 người phải cùng tọa độ Y = 70%");

    // Tuyến giữa 4 người
    const mids = pos343.filter((p) => p.y === 44);
    assert.strictEqual(mids.length, 4, "Tuyến giữa 4 người phải cùng tọa độ Y = 44%");

    // Hàng công 3 người
    const fwds = pos343.filter((p) => p.y === 18);
    assert.strictEqual(fwds.length, 3, "Hàng công 3 người phải cùng tọa độ Y = 18%");
  });

  it("4. calculateTacticalCoordinates khi không có formation hoặc dữ liệu thiếu/bất thường", () => {
    // Trường hợp mảng rỗng
    const emptyPos = calculateTacticalCoordinates([]);
    assert.strictEqual(emptyPos.length, 0);

    // Trường hợp chỉ có 5 cầu thủ và không có chuỗi formation
    const partial: MatchRosterPlayer[] = [
      createMockPlayer("1", "Keeper", "Goalkeeper", "1", true),
      createMockPlayer("2", "Def 1", "Defender", "2", true),
      createMockPlayer("3", "Mid 1", "Midfielder", "8", true),
      createMockPlayer("4", "Mid 2", "Midfielder", "10", true),
      createMockPlayer("5", "Fwd 1", "Forward", "9", true),
    ];

    const posPartial = calculateTacticalCoordinates(partial, undefined);
    assert.strictEqual(posPartial.length, 5, "Phải hiển thị đủ 5 cầu thủ không bị crash");
    for (const p of posPartial) {
      assert.ok(p.x >= 10 && p.x <= 90);
      assert.ok(p.y >= 10 && p.y <= 90);
    }
  });

  it("5. getPositionAbbreviation chuyển đổi chính xác các vị trí thi đấu", () => {
    assert.strictEqual(getPositionAbbreviation("Goalkeeper"), "GK");
    assert.strictEqual(getPositionAbbreviation("Center Defender"), "CB");
    assert.strictEqual(getPositionAbbreviation("Center Left Defender"), "CB-L");
    assert.strictEqual(getPositionAbbreviation("Center Right Defender"), "CB-R");
    assert.strictEqual(getPositionAbbreviation("Left Back"), "LB");
    assert.strictEqual(getPositionAbbreviation("Right Back"), "RB");
    assert.strictEqual(getPositionAbbreviation("Defensive Midfielder"), "DM");
    assert.strictEqual(getPositionAbbreviation("Attacking Midfielder"), "AM");
    assert.strictEqual(getPositionAbbreviation("Attacking Midfielder Left"), "AM-L");
    assert.strictEqual(getPositionAbbreviation("Attacking Midfielder Right"), "AM-R");
    assert.strictEqual(getPositionAbbreviation("Left Midfielder"), "LM");
    assert.strictEqual(getPositionAbbreviation("Right Midfielder"), "RM");
    assert.strictEqual(getPositionAbbreviation("Forward"), "FW");
    assert.strictEqual(getPositionAbbreviation("Striker"), "ST");
  });

  it("6. getShortDisplayName trích xuất tên ngắn gọn chuẩn", () => {
    const p1: MatchRosterPlayer = {
      id: "1",
      name: "Mads Hermansen",
      displayName: "Mads Hermansen",
      shortName: "M. Hermansen",
      jersey: "30",
      position: "Goalkeeper",
      starter: true,
    };
    assert.strictEqual(getShortDisplayName(p1), "M. Hermansen");

    const p2: MatchRosterPlayer = {
      id: "2",
      name: "Jamie Vardy",
      displayName: "Jamie Vardy",
      jersey: "9",
      position: "Forward",
      starter: true,
    };
    assert.strictEqual(getShortDisplayName(p2), "Vardy");
  });

  it("7. VectorJerseyToken & CircularBadgeToken render với số áo và fallback vị trí", () => {
    assert.strictEqual(typeof VectorJerseyToken, "function");
    assert.strictEqual(typeof CircularBadgeToken, "function");

    // Thử render VectorJerseyToken với JSX
    const jerseyEl = VectorJerseyToken({
      number: "10",
      roleAbbr: "LW",
      isHome: true,
      isGK: false,
    });
    assert.ok(jerseyEl, "VectorJerseyToken phải trả về React element");

    const badgeEl = CircularBadgeToken({
      number: "1",
      roleAbbr: "GK",
      isHome: false,
      isGK: true,
    });
    assert.ok(badgeEl, "CircularBadgeToken phải trả về React element");
  });

  it("8. translatePosition: dịch chuẩn xác vị trí từ tiếng Anh sang Tiếng Việt", () => {
    assert.strictEqual(translatePosition("Center Left Midfielder"), "Tiền vệ lệch trái");
    assert.strictEqual(translatePosition("Goalkeeper"), "Thủ môn");
    assert.strictEqual(translatePosition("Center Defender"), "Trung vệ");
    assert.strictEqual(translatePosition("Center Left Defender"), "Trung vệ lệch trái");
    assert.strictEqual(translatePosition("Left Back"), "Hậu vệ cánh trái");
    assert.strictEqual(translatePosition("Right Back"), "Hậu vệ cánh phải");
    assert.strictEqual(translatePosition("Defensive Midfielder"), "Tiền vệ phòng ngự");
    assert.strictEqual(translatePosition("Attacking Midfielder"), "Tiền vệ tấn công");
    assert.strictEqual(translatePosition("Center Midfielder"), "Tiền vệ trung tâm");
    assert.strictEqual(translatePosition("Striker"), "Tiền đạo cắm");
    assert.strictEqual(translatePosition("Left Wing"), "Tiền đạo cánh trái");
    assert.strictEqual(translatePosition("Right Wing"), "Tiền đạo cánh phải");
    assert.strictEqual(translatePosition(""), "Cầu thủ");
  });

  it("9. translateStatName: dịch đầy đủ chỉ số thống kê cá nhân sang Tiếng Việt", () => {
    assert.strictEqual(translateStatName("Appearances"), "Số trận ra sân");
    assert.strictEqual(translateStatName("Fouls Committed"), "Phạm lỗi");
    assert.strictEqual(translateStatName("Fouls Suffered"), "Bị phạm lỗi");
    assert.strictEqual(translateStatName("Own Goals"), "Phản lưới nhà");
    assert.strictEqual(translateStatName("Red Cards"), "Thẻ đỏ");
    assert.strictEqual(translateStatName("Substitute Appearances"), "Vào sân dự bị");
    assert.strictEqual(translateStatName("Yellow Cards"), "Thẻ vàng");
    assert.strictEqual(translateStatName("Goals Against"), "Bàn thua");
    assert.strictEqual(translateStatName("Shots Faced"), "Cú sút phải đối mặt");
    assert.strictEqual(translateStatName("Assists"), "Kiến tạo");
    assert.strictEqual(translateStatName("Offsides"), "Việt vị");
    assert.strictEqual(translateStatName("Shots On Goal"), "Sút trúng đích");
    assert.strictEqual(translateStatName("Total Goals"), "Bàn thắng");
    assert.strictEqual(translateStatName("Shots"), "Tổng cú sút");
  });

  it("10. translateStatName & translatePosition fallbacks an toàn khi gặp dữ liệu lạ hoặc rỗng", () => {
    assert.strictEqual(translateStatName(""), "");
    assert.strictEqual(translateStatName("Unknown Metric"), "Unknown Metric");
    assert.strictEqual(translatePosition(""), "Cầu thủ");
    assert.strictEqual(translatePosition(undefined as unknown as string), "Cầu thủ");
  });

  it("11. parseRawSummary: Trận chưa đá (scheduled) hoặc API trả về object { didSub: false } không bị hiển thị nhầm vào/ra sân", () => {
    const rawPreMatch = {
      header: {
        competitions: [
          {
            status: {
              type: {
                name: "STATUS_SCHEDULED",
                state: "pre",
                detail: "07:30",
              },
            },
            competitors: [
              { id: "1", homeAway: "home", team: { id: "1", displayName: "Inter Miami" } },
              { id: "2", homeAway: "away", team: { id: "2", displayName: "NYCFC" } },
            ],
          },
        ],
      },
      rosters: [
        {
          team: { id: "1" },
          formation: "4-3-3",
          roster: [
            {
              starter: true,
              jersey: "10",
              athlete: { id: "100", displayName: "Lionel Messi" },
              position: { displayName: "Forward" },
              subbedIn: { didSub: false },
              subbedOut: { didSub: false },
            },
            {
              starter: false,
              jersey: "17",
              athlete: { id: "101", displayName: "Ian Fray" },
              position: { displayName: "Defender" },
              subbedIn: { didSub: false },
              subbedOut: { didSub: false },
            },
          ],
        },
      ],
    };

    const summary = parseRawSummary("usa.1", "761861", rawPreMatch);
    assert.ok(summary);
    assert.strictEqual(summary.status, "scheduled");
    assert.strictEqual(summary.homeRoster.starters[0].subbedOut, false, "Cầu thủ đá chính trận chưa đá không thể có subbedOut = true");
    assert.strictEqual(summary.homeRoster.starters[0].subbedIn, false);
    assert.strictEqual(summary.homeRoster.bench[0].subbedIn, false, "Cầu thủ dự bị trận chưa đá không thể có subbedIn = true");
    assert.strictEqual(summary.homeRoster.bench[0].subbedOut, false);
  });

  it("12. getPositionAbbreviation & calculateTacticalCoordinates: chuẩn hóa tiền đạo trung tâm (Center Left/Right Forward -> ST, không bị nhầm thành LW/RW)", () => {
    // 1. Kiểm tra getPositionAbbreviation các biến thể tiền đạo trung tâm
    assert.strictEqual(getPositionAbbreviation("Center Left Forward"), "ST");
    assert.strictEqual(getPositionAbbreviation("Center Right Forward"), "ST");
    assert.strictEqual(getPositionAbbreviation("CF-L"), "ST");
    assert.strictEqual(getPositionAbbreviation("CF-R"), "ST");
    assert.strictEqual(getPositionAbbreviation("ST-L"), "ST");
    assert.strictEqual(getPositionAbbreviation("ST-R"), "ST");
    assert.strictEqual(getPositionAbbreviation("Center Forward"), "ST");
    assert.strictEqual(getPositionAbbreviation("Striker"), "ST");
    assert.strictEqual(getPositionAbbreviation("CF"), "ST");
    assert.strictEqual(getPositionAbbreviation("ST"), "ST");

    // 2. Kiểm tra getPositionAbbreviation các vị trí tiền đạo cánh (vẫn giữ nguyên LW/RW)
    assert.strictEqual(getPositionAbbreviation("Left Wing"), "LW");
    assert.strictEqual(getPositionAbbreviation("Left Winger"), "LW");
    assert.strictEqual(getPositionAbbreviation("LW"), "LW");
    assert.strictEqual(getPositionAbbreviation("Right Wing"), "RW");
    assert.strictEqual(getPositionAbbreviation("Right Winger"), "RW");
    assert.strictEqual(getPositionAbbreviation("RW"), "RW");

    // 3. Sơ đồ 4-4-2 thực tế (Chicago Fire FC): 2 tiền đạo cắm giữ nhãn ST, cánh LM/RM giữ nguyên
    const starters442: MatchRosterPlayer[] = [
      createMockPlayer("1", "C. Brady", "Goalkeeper", "1", true, 1),
      createMockPlayer("2", "N. Allen", "Left Back", "32", true, 3),
      createMockPlayer("3", "M. Mbokazi", "Center Left Defender", "4", true, 6),
      createMockPlayer("4", "J. Elliott", "Center Right Defender", "3", true, 5),
      createMockPlayer("5", "J. Dean", "Right Back", "24", true, 2),
      createMockPlayer("6", "J. Bamba", "Left Midfielder", "19", true, 11),
      createMockPlayer("7", "M. Pineda", "Center Left Midfielder", "22", true, 8),
      createMockPlayer("8", "A. Saletros", "Center Right Midfielder", "6", true, 4),
      createMockPlayer("9", "J. Gómez", "Right Midfielder", "18", true, 7),
      createMockPlayer("10", "M. Haile-Selassie", "Center Left Forward", "7", true, 9),
      createMockPlayer("11", "R. Lewandowski", "Center Right Forward", "9", true, 10),
    ];

    const positioned = calculateTacticalCoordinates(starters442, "4-4-2");
    assert.strictEqual(positioned.length, 11);

    const fwd1 = positioned.find((p) => p.player.id === "10");
    const fwd2 = positioned.find((p) => p.player.id === "11");
    assert.ok(fwd1 && fwd2);
    assert.strictEqual(fwd1.roleAbbr, "ST", "Center Left Forward phải hiển thị nhãn ST");
    assert.strictEqual(fwd2.roleAbbr, "ST", "Center Right Forward phải hiển thị nhãn ST");
    assert.strictEqual(fwd1.x, 34, "Tiền đạo lệch trái ở X = 34");
    assert.strictEqual(fwd2.x, 66, "Tiền đạo lệch phải ở X = 66");
    assert.strictEqual(fwd1.y, fwd2.y, "Hai tiền đạo cùng hàng ngang Y");

    const lm = positioned.find((p) => p.player.id === "6");
    const rm = positioned.find((p) => p.player.id === "9");
    assert.ok(lm && rm);
    assert.strictEqual(lm.roleAbbr, "LM", "Tiền vệ cánh trái giữ nguyên LM");
    assert.strictEqual(rm.roleAbbr, "RM", "Tiền vệ cánh phải giữ nguyên RM");
  });
});
