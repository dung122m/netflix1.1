import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Movie Sorting Logic & Actor Sort Presets", () => {
  const sampleMovies = [
    { name: "Phim Cũ 1998", year: 1998, tmdb_vote_average: 8.5, view: 15000 },
    { name: "Phim Vừa 2012", year: 2012, tmdb_vote_average: 7.2, view: 50000 },
    { name: "Phim Mới 2024", year: 2024, tmdb_vote_average: 6.8, view: 20000 },
    { name: "Phim Điểm Cao 2016", year: 2016, tmdb_vote_average: 9.3, view: 35000 },
    { name: "Phim Không Rõ Năm", year: 0, tmdb_vote_average: 5.0, view: 1000 },
  ];

  it("should sort correctly by year-desc (Mới nhất)", () => {
    const sorted = [...sampleMovies].sort((a, b) => {
      const yearA = parseInt(String(a.year || 0), 10) || 0;
      const yearB = parseInt(String(b.year || 0), 10) || 0;
      return yearB - yearA;
    });

    assert.equal(sorted[0].name, "Phim Mới 2024");
    assert.equal(sorted[1].name, "Phim Điểm Cao 2016");
    assert.equal(sorted[2].name, "Phim Vừa 2012");
    assert.equal(sorted[3].name, "Phim Cũ 1998");
    assert.equal(sorted[4].name, "Phim Không Rõ Năm");
  });

  it("should sort correctly by year-asc (Kinh điển / Cũ nhất)", () => {
    const sorted = [...sampleMovies].sort((a, b) => {
      const yearA = parseInt(String(a.year || 0), 10) || 0;
      const yearB = parseInt(String(b.year || 0), 10) || 0;
      if (yearA > 0 && yearB === 0) return -1;
      if (yearA === 0 && yearB > 0) return 1;
      return yearA - yearB;
    });

    assert.equal(sorted[0].name, "Phim Cũ 1998");
    assert.equal(sorted[1].name, "Phim Vừa 2012");
    assert.equal(sorted[2].name, "Phim Điểm Cao 2016");
    assert.equal(sorted[3].name, "Phim Mới 2024");
    assert.equal(sorted[4].name, "Phim Không Rõ Năm"); // pushed to end
  });

  it("should sort correctly by rating-desc (Điểm cao nhất)", () => {
    const sorted = [...sampleMovies].sort((a, b) => {
      const ratingA = parseFloat(String(a.tmdb_vote_average || 0)) || 0;
      const ratingB = parseFloat(String(b.tmdb_vote_average || 0)) || 0;
      return ratingB - ratingA;
    });

    assert.equal(sorted[0].name, "Phim Điểm Cao 2016"); // 9.3
    assert.equal(sorted[1].name, "Phim Cũ 1998"); // 8.5
    assert.equal(sorted[2].name, "Phim Vừa 2012"); // 7.2
    assert.equal(sorted[3].name, "Phim Mới 2024"); // 6.8
  });

  it("should sort correctly by views-desc (Xem nhiều nhất)", () => {
    const sorted = [...sampleMovies].sort((a, b) => {
      const viewsA = parseInt(String(a.view || 0), 10) || 0;
      const viewsB = parseInt(String(b.view || 0), 10) || 0;
      return viewsB - viewsA;
    });

    assert.equal(sorted[0].name, "Phim Vừa 2012"); // 50000
    assert.equal(sorted[1].name, "Phim Điểm Cao 2016"); // 35000
    assert.equal(sorted[2].name, "Phim Mới 2024"); // 20000
    assert.equal(sorted[3].name, "Phim Cũ 1998"); // 15000
  });
});
