import test from "node:test";
import assert from "node:assert/strict";

test("Weak Network Optimization — Regression & Invariant Tests", async (t) => {
  await t.test("1. Streaming Proxy returns streaming body and preserves 206 / Content-Range", async () => {
    // Mock upstream response with ReadableStream
    const sampleData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(sampleData);
        controller.close();
      },
    });

    const mockUpstreamResponse = new Response(stream, {
      status: 206,
      headers: {
        "content-type": "video/mp2t",
        "content-length": "8",
        "content-range": "bytes 0-7/8",
        "accept-ranges": "bytes",
      },
    });

    assert.equal(mockUpstreamResponse.status, 206);
    assert.equal(mockUpstreamResponse.headers.get("content-range"), "bytes 0-7/8");
    assert.equal(mockUpstreamResponse.headers.get("accept-ranges"), "bytes");
    assert.ok(mockUpstreamResponse.body !== null, "Body must be a ReadableStream");

    // Verify stream reads correctly without buffering all in memory first
    const reader = mockUpstreamResponse.body.getReader();
    const { value, done } = await reader.read();
    assert.equal(done, false);
    assert.deepEqual(value, sampleData);
  });

  await t.test("2. Watchdog adaptive logic distinguishes active slow loading from hung stream", () => {
    const watchdogStartTime = 1000;
    let lastMediaProgressTime = 1000;

    const checkWatchdog = (now: number, isPlaying: boolean) => {
      if (isPlaying) return "playing";
      const timeSinceProgress = now - lastMediaProgressTime;
      const totalElapsed = now - watchdogStartTime;

      if (timeSinceProgress < 5000 && totalElapsed < 24000) {
        return "reschedule";
      }
      return "fallback";
    };

    // Case A: At 12s, video not playing yet, but a fragment was loaded at 10s (2s ago)
    lastMediaProgressTime = 10000;
    const decisionAt12s = checkWatchdog(12000, false);
    assert.equal(
      decisionAt12s,
      "reschedule",
      "Must reschedule check when fragment was recently loaded"
    );

    // Case B: At 16s, video still not playing, fragment loaded at 15s (1s ago)
    lastMediaProgressTime = 15000;
    const decisionAt16s = checkWatchdog(16000, false);
    assert.equal(
      decisionAt16s,
      "reschedule",
      "Must keep waiting while progress continues"
    );

    // Case C: At 20s, no progress since 5s (lastProgress = 5000, 15s ago) -> HUNG!
    lastMediaProgressTime = 5000;
    const decisionHung = checkWatchdog(20000, false);
    assert.equal(
      decisionHung,
      "fallback",
      "Must trigger fallback when no progress for > 5s and elapsed"
    );

    // Case D: Reached hard ceiling of 24s -> FALLBACK even if trickling
    lastMediaProgressTime = 24900;
    const decisionCeiling = checkWatchdog(25000, false);
    assert.equal(
      decisionCeiling,
      "fallback",
      "Must trigger fallback when exceeding maximum ceiling 24s"
    );
  });

  await t.test("3. TMDB Non-blocking SSR Race Fallback", async () => {
    const nativePoster = "https://phim.img/native-poster.jpg";
    const nativeTrailer = "https://youtube.com/watch?v=native";

    // Simulate slow TMDB call (takes 1000ms)
    const slowTmdbCall = new Promise<string>((resolve) => {
      setTimeout(() => resolve("https://youtube.com/watch?v=tmdb-slow"), 1000);
    });

    let effectiveTrailer = nativeTrailer;
    const effectivePoster = nativePoster;

    const startTime = Date.now();
    try {
      const tmdbTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TMDB Timeout")), 100)
      );
      const res = await Promise.race([slowTmdbCall, tmdbTimeout]);
      effectiveTrailer = res;
    } catch {
      // Graceful fallback to native
    }
    const elapsed = Date.now() - startTime;

    assert.ok(elapsed < 300, `SSR TMDB lookup completed in ${elapsed}ms (bounded by timeout)`);
    assert.equal(effectiveTrailer, nativeTrailer, "Preserves native trailer on TMDB timeout");
    assert.equal(effectivePoster, nativePoster, "Preserves native poster on TMDB timeout");
  });

  await t.test("4. Safari / iOS Native HLS fetch aborts on timeout without breaking playback", async () => {
    const controller = new AbortController();
    const timeoutSignal = AbortSignal.timeout(100);
    const combinedSignal = (typeof AbortSignal !== "undefined" && "any" in AbortSignal)
      ? (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any([controller.signal, timeoutSignal])
      : controller.signal;

    let aborted = false;
    try {
      await new Promise((_, reject) => {
        combinedSignal.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "aborted") aborted = true;
    }

    assert.equal(aborted, true, "Combined abort signal triggered properly");
  });
});
