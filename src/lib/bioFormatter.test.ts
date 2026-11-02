import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isTrailingDanglingHeading,
  stripTrailingDanglingHeadings,
  selectBestBiography,
  parseBioContent,
} from "./bioFormatter";

describe("BioFormatter & Dangling Heading Detection", () => {
  it("TC1: Should detect Vietnamese dangling headings at end of text", () => {
    assert.strictEqual(isTrailingDanglingHeading("Sự nghiệp:"), true);
    assert.strictEqual(isTrailingDanglingHeading("Tác phẩm:"), true);
    assert.strictEqual(isTrailingDanglingHeading("Thời niên thiếu:"), true);
    assert.strictEqual(isTrailingDanglingHeading("Khởi đầu sự nghiệp:"), true);
    assert.strictEqual(isTrailingDanglingHeading("Diễn xuất:"), true);
    assert.strictEqual(isTrailingDanglingHeading("1979 - 1991:"), true);
    assert.strictEqual(isTrailingDanglingHeading("1991–2003:"), true);
    assert.strictEqual(isTrailingDanglingHeading("2006–2017: Thành công tại TVB:"), true);
  });

  it("TC2: Should detect English dangling headings at end of text", () => {
    assert.strictEqual(isTrailingDanglingHeading("Career:"), true);
    assert.strictEqual(isTrailingDanglingHeading("Early life:"), true);
    assert.strictEqual(isTrailingDanglingHeading("2017–present: Breakthrough and continued success:"), true);
  });

  it("TC3: Should preserve valid year ranges in the middle of paragraphs", () => {
    const textWithYear = "Trong giai đoạn 1979 - 1991, Hanks đã đoạt nhiều giải thưởng danh giá và tạo bước ngoặt lớn.";
    const result = stripTrailingDanglingHeadings(textWithYear);
    assert.strictEqual(result, textWithYear);
    assert.strictEqual(isTrailingDanglingHeading(textWithYear), false);
  });

  it("TC4: Should clean Tom Hanks tail and prevent empty heading in parsed sections", () => {
    const rawTomBio =
      "Hanks đã giành giải Nam diễn viên xuất sắc nhất của Hiệp hội phê bình Cleveland cho vai Proteus trong Hai quý ông thành Verona.\n\nSự nghiệp:\n\n1979 - 1991:";
    const cleaned = stripTrailingDanglingHeadings(rawTomBio);

    assert.strictEqual(cleaned.includes("1979 - 1991:"), false);
    assert.strictEqual(cleaned.includes("Sự nghiệp:"), false);
    assert.ok(cleaned.endsWith("Hai quý ông thành Verona."));

    const parsed = parseBioContent(rawTomBio);
    // Sections should not contain an empty "Sự nghiệp" section with dangling 1979 - 1991
    parsed.sections.forEach((s) => {
      s.paragraphs.forEach((p) => {
        assert.notStrictEqual(p.trim(), "1979 - 1991:");
        assert.notStrictEqual(p.trim(), "Sự nghiệp:");
      });
    });
  });

  it("TC5: Should handle normal biography ending with complete sentence", () => {
    const normalBio =
      "Trấn Thành là một nghệ sĩ đa tài của điện ảnh Việt Nam. Anh đã đạo diễn nhiều phim đạt doanh thu trăm tỷ.";
    const result = stripTrailingDanglingHeadings(normalBio);
    assert.strictEqual(result, normalBio);
  });

  it("TC6: Should handle very brief biographies (a few lines) gracefully", () => {
    const brief = "Diễn viên trẻ triển vọng của màn ảnh Việt.";
    const parsed = parseBioContent(brief);
    assert.strictEqual(parsed.leadParagraph, brief);
    assert.strictEqual(parsed.sections.length, 0);
  });

  it("TC7: Should fallback to clean historical bio when Wikipedia is unavailable", () => {
    const selected = selectBestBiography({
      historicalBio: "Tiểu sử nghệ sĩ với đầy đủ chi tiết và thông tin sự nghiệp phong phú.\n\nSự nghiệp:\n\n1990:",
      wikiExtract: null,
      tmdbBio: null,
    });
    assert.ok(selected);
    assert.strictEqual(selected.includes("1990:"), false);
    assert.ok(selected.endsWith("thông tin sự nghiệp phong phú."));
  });

  it("TC8: Should fallback to TMDb biography when historical and Wikipedia are unavailable", () => {
    const selected = selectBestBiography({
      historicalBio: null,
      wikiExtract: null,
      tmdbBio: "A renowned actor known worldwide for his versatile dramatic roles.",
    });
    assert.strictEqual(selected, "A renowned actor known worldwide for his versatile dramatic roles.");
  });

  it("TC9: Should fallback to wikiDescription when no bio text exists", () => {
    const selected = selectBestBiography({
      historicalBio: null,
      wikiExtract: null,
      tmdbBio: null,
      wikiDescription: "Nghệ sĩ ưu tú / Đạo diễn điện ảnh",
    });
    assert.strictEqual(selected, "Nghệ sĩ ưu tú / Đạo diễn điện ảnh");
  });

  it("TC10: Should prefer comprehensive Wikipedia extract over truncated historical bio", () => {
    const truncatedHistorical = "Tom Hanks sinh tại California.\n\nSự nghiệp:\n\n1979:";
    const richWikipedia =
      "Thomas Jeffrey Hanks là nam diễn viên người Mỹ đoạt 2 giải Oscar danh giá.\n\nTiểu sử:\n\nÔng sinh năm 1956 tại California và bắt đầu đóng kịch từ thời sinh viên.\n\nSự nghiệp:\n\nTừ năm 1979 đến nay ông đã tham gia hơn 80 bộ phim lớn.";

    const selected = selectBestBiography({
      historicalBio: truncatedHistorical,
      wikiExtract: richWikipedia,
      tmdbBio: null,
    });

    assert.strictEqual(selected, richWikipedia);
  });
});
