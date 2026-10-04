import test from "node:test";
import assert from "node:assert/strict";
import {
  HISTORICAL_FIGURES,
  resolveHistoricalFigure,
  getHistoricalFigureById,
  getHistoricalFiguresForPeriod,
  getCanonicalFigureName,
} from "./figures";
import { HISTORICAL_PERIODS } from "./periods";

test("Historical Figures Entity Linking & Resolution Validation", async (t) => {
  await t.test("Figure Catalog Integrity: All figures have valid ID, canonicalName, periodId, summary", () => {
    assert.ok(
      HISTORICAL_FIGURES.length >= 20,
      `Expected >= 20 figures, found ${HISTORICAL_FIGURES.length}`
    );

    const validPeriodIds = new Set(HISTORICAL_PERIODS.map((p) => p.id));
    const seenIds = new Set<string>();
    const seenCanonicalNames = new Set<string>();

    for (const fig of HISTORICAL_FIGURES) {
      assert.ok(fig.id && fig.id.trim().length > 0, "Missing ID");
      assert.ok(!seenIds.has(fig.id), `Duplicate figure ID: ${fig.id}`);
      seenIds.add(fig.id);

      assert.ok(fig.canonicalName && fig.canonicalName.trim().length > 0, `Missing canonicalName for ${fig.id}`);
      assert.ok(!seenCanonicalNames.has(fig.canonicalName), `Duplicate canonicalName: ${fig.canonicalName}`);
      seenCanonicalNames.add(fig.canonicalName);

      assert.ok(validPeriodIds.has(fig.periodId), `Invalid periodId: ${fig.periodId} for ${fig.id}`);
      assert.ok(fig.title && fig.title.trim().length > 0, `Missing title for ${fig.id}`);
      assert.ok(fig.summary && fig.summary.trim().length > 0, `Missing summary for ${fig.id}`);
      assert.ok(Array.isArray(fig.aliases), `Aliases must be an array for ${fig.id}`);
    }
  });

  await t.test("9 Core Historical Figures Resolution: Exact and Alias Matching", () => {
    const requiredFigures = [
      {
        expectedId: "ho-chi-minh",
        expectedCanonical: "Hồ Chí Minh",
        inputs: ["Hồ Chí Minh", "Nguyễn Ái Quốc", "Nguyễn Tất Thành", "Bác Hồ", "Chủ tịch Hồ Chí Minh", "Anh Ba", "ho-chi-minh"]
      },
      {
        expectedId: "tran-hung-dao",
        expectedCanonical: "Trần Hưng Đạo",
        inputs: ["Trần Hưng Đạo", "Trần Quốc Tuấn", "Hưng Đạo Đại Vương", "Hưng Đạo Vương", "Đức Thánh Trần", "tran-hung-dao"]
      },
      {
        expectedId: "ly-thuong-kiet",
        expectedCanonical: "Lý Thường Kiệt",
        inputs: ["Lý Thường Kiệt", "Ngô Tuấn", "Thái úy Lý Thường Kiệt", "ly-thuong-kiet"]
      },
      {
        expectedId: "quang-trung",
        expectedCanonical: "Quang Trung",
        inputs: ["Quang Trung", "Nguyễn Huệ", "Bắc Bình Vương", "Hoàng đế Quang Trung", "quang-trung"]
      },
      {
        expectedId: "ly-bi",
        expectedCanonical: "Lý Bí",
        inputs: ["Lý Bí", "Lý Nam Đế", "Tiền Lý Nam Đế", "ly-bi"]
      },
      {
        expectedId: "vo-nguyen-giap",
        expectedCanonical: "Võ Nguyên Giáp",
        inputs: ["Võ Nguyên Giáp", "Đại tướng Võ Nguyên Giáp", "Bác Giáp", "Tổng Tư lệnh Võ Nguyên Giáp", "vo-nguyen-giap"]
      },
      {
        expectedId: "hai-ba-trung",
        expectedCanonical: "Hai Bà Trưng",
        inputs: ["Hai Bà Trưng", "Trưng Trắc", "Trưng Nhị", "Trưng Nữ Vương", "hai-ba-trung"]
      },
      {
        expectedId: "dinh-bo-linh",
        expectedCanonical: "Đinh Bộ Lĩnh",
        inputs: ["Đinh Bộ Lĩnh", "Đinh Tiên Hoàng", "Vạn Thắng Vương", "dinh-bo-linh"]
      },
      {
        expectedId: "le-loi",
        expectedCanonical: "Lê Lợi",
        inputs: ["Lê Lợi", "Lê Thái Tổ", "Bình Định Vương", "le-loi"]
      }
    ];

    for (const testCase of requiredFigures) {
      for (const input of testCase.inputs) {
        const resolved = resolveHistoricalFigure(input);
        assert.ok(resolved, `Failed to resolve input: "${input}"`);
        assert.equal(resolved?.id, testCase.expectedId, `Mismatch ID for input: "${input}"`);
        assert.equal(resolved?.canonicalName, testCase.expectedCanonical, `Mismatch CanonicalName for input: "${input}"`);
      }
    }
  });

  await t.test("Diacritic-insensitive & Case-insensitive Resolution", () => {
    assert.equal(resolveHistoricalFigure("ho chi minh")?.id, "ho-chi-minh");
    assert.equal(resolveHistoricalFigure("nguyen hue")?.id, "quang-trung");
    assert.equal(resolveHistoricalFigure("tran quoc tuan")?.id, "tran-hung-dao");
    assert.equal(resolveHistoricalFigure("ly nam de")?.id, "ly-bi");
    assert.equal(resolveHistoricalFigure("dinh tien hoang")?.id, "dinh-bo-linh");
    assert.equal(resolveHistoricalFigure("le thai to")?.id, "le-loi");
    assert.equal(resolveHistoricalFigure("vo nguyen giap")?.id, "vo-nguyen-giap");
  });

  await t.test("Helper functions: getHistoricalFigureById & getCanonicalFigureName", () => {
    const fig = getHistoricalFigureById("quang-trung");
    assert.ok(fig);
    assert.equal(fig?.canonicalName, "Quang Trung");

    assert.equal(getCanonicalFigureName("Nguyễn Huệ"), "Quang Trung");
    assert.equal(getCanonicalFigureName("Trần Quốc Tuấn"), "Trần Hưng Đạo");
    assert.equal(getCanonicalFigureName("Nguyễn Ái Quốc"), "Hồ Chí Minh");
    assert.equal(getCanonicalFigureName("Unknown Entity"), "Unknown Entity");

    const lyTranFigures = getHistoricalFiguresForPeriod("ly-tran-ho");
    assert.ok(lyTranFigures.length >= 3);
    const figureIds = lyTranFigures.map((f) => f.id);
    assert.ok(figureIds.includes("tran-hung-dao"));
    assert.ok(figureIds.includes("ly-thuong-kiet"));
    assert.ok(figureIds.includes("tran-nhan-tong"));
  });

  await t.test("Unknown figures safely return undefined without throwing errors", () => {
    assert.equal(resolveHistoricalFigure(""), undefined);
    assert.equal(resolveHistoricalFigure("Random Non-existent Name 12345"), undefined);
    assert.equal(getHistoricalFigureById("invalid-id-xyz"), undefined);
  });
});
