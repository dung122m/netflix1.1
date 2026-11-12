import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { enrichMovieListPosters } from "@/services/movies/posterEnrichment";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("posterEnrichment budgetMs AbortController & stripProxyUrls", () => {
  it("aborts stalled external lookups at budgetMs and strips /api/img-thumb fallback", async () => {
    let observedSignal: AbortSignal | undefined;
    let signalAbortedObserved = false;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      observedSignal = init?.signal ?? undefined;
      return await new Promise<Response>((_resolve, reject) => {
        if (init?.signal) {
          if (init.signal.aborted) {
            signalAbortedObserved = true;
            reject(init.signal.reason ?? new DOMException("Aborted", "AbortError"));
            return;
          }
          init.signal.addEventListener(
            "abort",
            () => {
              signalAbortedObserved = true;
              reject(init.signal?.reason ?? new DOMException("Aborted", "AbortError"));
            },
            { once: true }
          );
        }
      });
    }) as typeof fetch;

    const movies = [
      {
        name: "Timeout Regression Test Movie 2099",
        origin_name: "Timeout Regression Test Movie 2099",
        slug: "timeout-regression-test-movie-2099",
        year: 2099,
        type: "movie",
        tmdb: { id: 999999991, type: "movie" },
        poster_url: "/api/img-thumb?url=https%3A%2F%2Fphimimg.com%2Ftest.jpg",
        thumb_url: "/api/img-thumb?url=https%3A%2F%2Fphimimg.com%2Ftest-thumb.jpg",
      },
    ];

    const startedAt = Date.now();
    await enrichMovieListPosters(movies, { budgetMs: 80, stripProxyUrls: true });
    const elapsedMs = Date.now() - startedAt;

    // Allow microtask tick for abort event listener to settle
    await new Promise((r) => setTimeout(r, 15));

    assert.ok(elapsedMs < 1000, `Expected budget return under 1000ms, got ${elapsedMs}ms`);
    assert.ok(observedSignal, "Expected fetch to receive combined AbortSignal");
    assert.strictEqual(observedSignal?.aborted, true, "Expected fetch AbortSignal to be aborted after budgetMs");
    assert.strictEqual(signalAbortedObserved, true, "Expected abort event listener to fire on stalled socket");
    assert.strictEqual(movies[0].poster_url, "", "Expected legacy /api/img-thumb poster URL to be stripped on abort");
    assert.strictEqual(movies[0].thumb_url, "", "Expected legacy /api/img-thumb thumb URL to be stripped on abort");
  });
});

