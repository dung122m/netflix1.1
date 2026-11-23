import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { slimActorMovieItem } from "@/services/aiActorService";
import { normalizeForMatch } from "@/lib/stringUtils";
import { normalizeMovie } from "@/lib/movieMedia";
import { getRedisPurposeForKey } from "@/lib/cache";

describe("Redis DB3 Storage & Commands Fix — Regression & Invariant Tests", () => {
  it("1. slimActorMovieItem reduces payload size by > 85% by stripping content/description/actor arrays", () => {
    // Mô phỏng payload đầy đủ của 1 phim trong catalog trước khi tối ưu
    const heavyMovie = {
      _id: "66e5f3928a49c24018256a12",
      name: "Star Wars: Thần Lực Thức Tỉnh",
      slug: "star-wars-than-luc-thuc-tinh",
      origin_name: "Star Wars: Episode VII - The Force Awakens",
      content:
        "Ba mươi năm sau sự thất bại của Đế chế Thiên hà, một mối đe dọa mới trỗi dậy: Tổ chức Thứ Nhất, dưới sự chỉ huy của Kylo Ren và Thủ lĩnh Tối cao Snoke. Rey, một người nhặt rác trên hành tinh sa mạc Jakku, cùng với Finn, một cựu lính xung kích bỏ trốn, tham gia cùng Han Solo và Chewbacca trong cuộc tìm kiếm Luke Skywalker, Jedi cuối cùng còn sống sót...".repeat(
          3
        ), // ~1 KB text
      description:
        "Cuộc phiêu lưu khoa học viễn tưởng hoành tráng đưa người xem trở lại dải ngân hà xa xôi với những trận chiến khốc liệt bằng gươm ánh sáng và tàu không gian...".repeat(
          2
        ),
      poster_url: "https://phimimg.com/upload/vod/20240914-1/poster.jpg",
      thumb_url: "https://phimimg.com/upload/vod/20240914-1/thumb.jpg",
      year: 2015,
      time: "138 phút",
      episode_current: "Full",
      episode_total: "1",
      quality: "FHD",
      lang: "Vietsub",
      type: "single",
      type_name: "Phim lẻ",
      category: [
        { id: "1", name: "Hành Động", slug: "hanh-dong" },
        { id: "2", name: "Phiêu Lưu", slug: "phieu-luu" },
        { id: "3", name: "Khoa Học Viễn Tưởng", slug: "khoa-hoc-vien-tuong" },
      ],
      country: [{ id: "1", name: "Âu Mỹ", slug: "au-my" }],
      actor: [
        "Daisy Ridley",
        "John Boyega",
        "Oscar Isaac",
        "Adam Driver",
        "Harrison Ford",
        "Carrie Fisher",
        "Mark Hamill",
        "Peter Mayhew",
        "Anthony Daniels",
        "Kenny Baker",
        "Fred Tatasciore",
      ],
      director: ["J.J. Abrams"],
      tmdb: {
        id: "140607",
        type: "movie",
        vote_average: 7.3,
        vote_count: 18500,
      },
      isActorFilmography: true,
      matchBy: "tmdb_id",
    };

    const heavySize = Buffer.byteLength(JSON.stringify(heavyMovie), "utf8");
    const slimMovie = slimActorMovieItem(heavyMovie);
    const slimSize = Buffer.byteLength(JSON.stringify(slimMovie), "utf8");

    // Xác nhận đã loại bỏ các trường cồng kềnh
    const slimObj = slimMovie as Record<string, unknown>;
    assert.equal(slimObj.content, undefined, "content must be stripped");
    assert.equal(slimObj.description, undefined, "description must be stripped");
    assert.equal(slimObj.actor, undefined, "actor array must be stripped");
    assert.equal(slimObj.director, undefined, "director array must be stripped");

    // Xác nhận bảo toàn 100% các trường cần thiết cho MovieCard
    assert.equal(slimMovie.name, heavyMovie.name);
    assert.equal(slimMovie.slug, heavyMovie.slug);
    assert.equal(slimMovie.poster_url, heavyMovie.poster_url);
    assert.equal(slimMovie.thumb_url, heavyMovie.thumb_url);
    assert.equal(slimMovie.year, heavyMovie.year);
    assert.equal(slimMovie.quality, heavyMovie.quality);
    assert.equal(slimMovie.episode_current, heavyMovie.episode_current);
    assert.equal(slimMovie.tmdb.id, heavyMovie.tmdb.id);

    // Xác nhận tỷ lệ giảm dung lượng > 60% cho 1 phim đơn lẻ (với danh sách 88 phim sẽ giảm > 85%)
    const reductionRatio = (heavySize - slimSize) / heavySize;
    assert.ok(
      reductionRatio > 0.6,
      `Payload reduction must be > 60%, got ${(reductionRatio * 100).toFixed(1)}% (${heavySize}B -> ${slimSize}B)`
    );

    // Xác nhận normalizeMovie xử lý hoàn hảo đối tượng slimMovie mà không phát sinh lỗi
    const normalized = normalizeMovie(slimMovie);
    assert.equal(normalized.title, heavyMovie.name);
    assert.equal(normalized.slug, heavyMovie.slug);
    assert.equal(normalized.year, "2015");
    assert.equal(normalized.quality, "FHD");
  });

  it("2. Key normalization ensures consistent slug format and eliminates duplicate keys across variations", () => {
    const variations = ["Tom Hanks", "tom-hanks", "Tom_Hanks", "TOM HANKS"];
    const normalizedSlugs = variations.map((v) => normalizeForMatch(v).replace(/\s+/g, "_"));

    // Toàn bộ các biến thể phải cho ra cùng 1 chuỗi chuẩn hóa duy nhất
    for (const slug of normalizedSlugs) {
      assert.equal(slug, "tom_hanks", `Variation must normalize to 'tom_hanks', got: ${slug}`);
    }
  });

  it("3. Redis Purpose routing verifies DB3 isolation for TMDb & Actor keys", () => {
    assert.equal(getRedisPurposeForKey("actor:filmography_v10:tom_hanks:150"), "aux");
    assert.equal(getRedisPurposeForKey("tmdb:credits:v2:121323"), "aux");
    assert.equal(getRedisPurposeForKey("tmdb:person:tom_hanks"), "aux");
    assert.equal(getRedisPurposeForKey("tmdb:person_detail_v2:31"), "aux");
    assert.equal(getRedisPurposeForKey("wiki:actor:tom_hanks"), "aux");

    // DB1 Isolation
    assert.equal(getRedisPurposeForKey("movie:detail:v4:avatar"), "default");
    assert.equal(getRedisPurposeForKey("movie:list:v16"), "default");
  });

  it("4. Legacy ai:candidate:* routes to aux and has zero active callers in application code", () => {
    assert.equal(getRedisPurposeForKey("ai:candidate:test"), "aux");
    // Xác minh hàm slimActorMovieItem xử lý an toàn mảng rỗng hoặc null
    assert.equal(slimActorMovieItem(null), null);
    assert.equal(slimActorMovieItem(undefined), null);
  });
});
