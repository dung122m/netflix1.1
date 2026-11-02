import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pickBestMoviePoster,
  pickBestMovieThumb,
  toOptimizedPhimimgUrl,
  toOptimizedCardBackdropUrl,
  toOptimizedCardPosterUrl,
  toHighResBackdropUrl,
} from "./movieMedia";

describe("Movie Media Complete Phimimg Purge Invariant", () => {
  const samplePhimimgUrls = [
    "https://phimimg.com/upload/vod/20240101-1/sample-poster.jpg",
    "https://phimimg.com/upload/vod/20240101-1/sample-thumb.webp",
    "https://phimimg.com/uploads/movies/duoi-day-ho-thumb.webp",
    "https://phimimg.com/uploads/movies/duoi-day-ho-poster.webp",
    "/api/img-thumb?url=https%3A%2F%2Fphimimg.com%2Fsample.jpg",
  ];

  it("toOptimizedPhimimgUrl completely rejects all phimimg.com and proxy URLs (returns empty string)", () => {
    for (const url of samplePhimimgUrls) {
      const res = toOptimizedPhimimgUrl(url, 320);
      assert.equal(res, "", `Expected empty string for purged phimimg, got: ${res}`);
    }
  });

  it("toOptimizedCardBackdropUrl completely rejects all phimimg.com and proxy URLs (returns empty string)", () => {
    for (const url of samplePhimimgUrls) {
      const res = toOptimizedCardBackdropUrl(url, 320);
      assert.equal(res, "", `Expected empty string for purged phimimg, got: ${res}`);
    }
  });

  it("toOptimizedCardPosterUrl completely rejects all phimimg.com and proxy URLs (returns empty string)", () => {
    for (const url of samplePhimimgUrls) {
      const res = toOptimizedCardPosterUrl(url, 320);
      assert.equal(res, "", `Expected empty string for purged phimimg, got: ${res}`);
    }
  });

  it("toHighResBackdropUrl completely rejects all phimimg.com and proxy URLs (returns empty string)", () => {
    for (const url of samplePhimimgUrls) {
      const res = toHighResBackdropUrl(url, "w1280");
      assert.equal(res, "", `Expected empty string for purged phimimg, got: ${res}`);
    }
  });

  it("pickBestMoviePoster returns empty string when only phimimg candidates are present and fallback is empty", () => {
    const res = pickBestMoviePoster(
      {
        poster_url: "https://phimimg.com/upload/vod/20240101-1/sample-poster.jpg",
        thumb_url: "https://phimimg.com/upload/vod/20240101-1/sample-thumb.webp",
      },
      ""
    );
    assert.equal(res, "", `Expected empty string so Canvas renders immediately, got: ${res}`);
  });

  it("pickBestMovieThumb returns empty string when only phimimg candidates are present and fallback is empty", () => {
    const res = pickBestMovieThumb(
      {
        poster_url: "https://phimimg.com/upload/vod/20240101-1/sample-poster.jpg",
        thumb_url: "https://phimimg.com/upload/vod/20240101-1/sample-thumb.webp",
      },
      ""
    );
    assert.equal(res, "", `Expected empty string so Canvas renders immediately, got: ${res}`);
  });

  it("prioritizes official TMDb image when present and discards phimimg thumb", () => {
    const res = pickBestMoviePoster({
      poster_url: "https://image.tmdb.org/t/p/w500/tmdb-poster.jpg",
      thumb_url: "https://phimimg.com/upload/vod/20240101-1/sample-thumb.webp",
    });
    assert.ok(res.includes("image.tmdb.org"), `Expected TMDb URL, got: ${res}`);
  });

  it("preserves valid AniList or third-party safe CDN URLs", () => {
    const res = pickBestMoviePoster({
      poster_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/sample.jpg",
      thumb_url: "https://phimimg.com/upload/vod/20240101-1/sample-thumb.webp",
    });
    assert.ok(res.includes("anilist.co"), `Expected AniList URL, got: ${res}`);
  });
});
