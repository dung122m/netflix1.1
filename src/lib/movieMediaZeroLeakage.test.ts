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

describe("Movie Media Phimimg & CDN Safe Fallback Invariant", () => {
  const samplePosterWebp = "https://phimimg.com/uploads/movies/sample-poster.webp";
  const sampleThumbWebp = "https://phimimg.com/uploads/movies/sample-thumb.webp";
  const sampleJpg = "https://phimimg.com/upload/vod/20240101-1/sample-poster.jpg";

  it("toOptimizedPhimimgUrl preserves clean phimimg URLs directly without broken proxy", () => {
    assert.equal(toOptimizedPhimimgUrl(samplePosterWebp, 320), samplePosterWebp);
    assert.equal(toOptimizedPhimimgUrl(sampleJpg, 320), sampleJpg);
  });

  it("toOptimizedCardBackdropUrl normalizes phimimg -poster.webp to -thumb.webp for 16:9 aspect ratio", () => {
    assert.equal(toOptimizedCardBackdropUrl(samplePosterWebp, 320), sampleThumbWebp);
    assert.equal(toOptimizedCardBackdropUrl(sampleThumbWebp, 320), sampleThumbWebp);
  });

  it("toOptimizedCardPosterUrl normalizes phimimg -thumb.webp to -poster.webp for 2:3 aspect ratio", () => {
    assert.equal(toOptimizedCardPosterUrl(sampleThumbWebp, 320), samplePosterWebp);
    assert.equal(toOptimizedCardPosterUrl(samplePosterWebp, 320), samplePosterWebp);
  });

  it("toHighResBackdropUrl normalizes phimimg -poster.webp to -thumb.webp for high-res hero banner", () => {
    assert.equal(toHighResBackdropUrl(samplePosterWebp, "w1280"), sampleThumbWebp);
  });

  it("pickBestMoviePoster returns valid phimimg poster when only phimimg candidates are present", () => {
    const res = pickBestMoviePoster(
      {
        poster_url: samplePosterWebp,
        thumb_url: sampleThumbWebp,
      },
      ""
    );
    assert.equal(res, samplePosterWebp);
  });

  it("pickBestMovieThumb returns valid phimimg thumb when only phimimg candidates are present", () => {
    const res = pickBestMovieThumb(
      {
        poster_url: samplePosterWebp,
        thumb_url: sampleThumbWebp,
      },
      ""
    );
    assert.equal(res, sampleThumbWebp);
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
