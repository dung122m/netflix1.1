import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { movieApi, deduplicateMovieItems, extractMovieRatingScore } from "@/services/movies/service";

describe("Nanaflix — Rating Audit & Sorting Test Suite", () => {
  it("1. extractMovieRatingScore correctly normalizes ratings and handles edge cases", () => {
    // TMDB vote_average
    assert.deepEqual(extractMovieRatingScore({ tmdb: { vote_average: 8.5, vote_count: 120 } }), { rating: 8.5, voteCount: 120 });
    // String numbers
    assert.deepEqual(extractMovieRatingScore({ imdb: { vote_average: "7.8", vote_count: "50" } }), { rating: 7.8, voteCount: 50 });
    // Fallback to internal score
    assert.deepEqual(extractMovieRatingScore({ score: "9.1" }), { rating: 9.1, voteCount: 0 });
    // Invalid scores should return 0 (never high default)
    assert.deepEqual(extractMovieRatingScore({}), { rating: 0, voteCount: 0 });
    assert.deepEqual(extractMovieRatingScore(null), { rating: 0, voteCount: 0 });
    assert.deepEqual(extractMovieRatingScore({ tmdb: { vote_average: 0 } }), { rating: 0, voteCount: 0 });
    assert.deepEqual(extractMovieRatingScore({ score: "N/A" }), { rating: 0, voteCount: 0 });
    assert.deepEqual(extractMovieRatingScore({ imdb: { vote_average: -1 } }), { rating: 0, voteCount: 0 });
    assert.deepEqual(extractMovieRatingScore({ tmdb: { vote_average: 15 } }), { rating: 0, voteCount: 0 });
  });

  it("2. deduplicateMovieItems preserves valid rating metadata across sources", () => {
    // PhimAPI has vote_average: 0, VSMOV has vote_average: 7.7
    const items = [
      {
        slug: "thuan-huyet",
        name: "Thuần Huyết",
        source: "phimapi",
        tmdb: { id: "10545", vote_average: 0, vote_count: 0 },
      },
      {
        slug: "thuan-huyet",
        name: "Thuần Huyết",
        source: "vsmov",
        tmdb: { id: "10545", vote_average: 7.7, vote_count: 2157 },
      },
    ];

    const deduped = deduplicateMovieItems(items);
    assert.equal(deduped.length, 1);
    assert.equal(deduped[0].tmdb?.vote_average, 7.7, "Must enrich vote_average from VSMOV when PhimAPI is 0");
    assert.equal(deduped[0].tmdb?.vote_count, 2157, "Must enrich vote_count from VSMOV when PhimAPI is 0");
  });

  it("3. movieApi.getMovies with sort='rating' returns items in strictly descending order with stable tie-break", async () => {
    const res = await movieApi.getMovies({ sort: "rating", limit: 16, skipKvCache: true });
    assert.ok(res.items && res.items.length > 0, "Must return movie items");

    for (let i = 0; i < res.items.length - 1; i++) {
      const a = extractMovieRatingScore(res.items[i]);
      const b = extractMovieRatingScore(res.items[i + 1]);

      // Rating must be non-increasing
      assert.ok(
        a.rating >= b.rating,
        `Rating at [${i}] (${a.rating}) must be >= rating at [${i + 1}] (${b.rating})`
      );

      // If rating is equal, vote count must be non-increasing (or year as secondary)
      if (a.rating === b.rating && a.voteCount !== b.voteCount) {
        assert.ok(
          a.voteCount >= b.voteCount,
          `Vote count at [${i}] (${a.voteCount}) must be >= vote count at [${i + 1}] (${b.voteCount}) on tie`
        );
      }
    }
  });
});
