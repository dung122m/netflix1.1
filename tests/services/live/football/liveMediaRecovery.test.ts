import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateLiveMediaErrorRecovery,
  LIVE_MEDIA_RECOVERY_COOLDOWN_MS,
  LIVE_MEDIA_RECOVERY_WINDOW_MS,
} from "@/services/live/shared/liveBufferHelper";

describe("Live Football HLS Media Error Recovery Guard", () => {
  test("1. First MEDIA_ERROR runs immediate recover without forced seek", () => {
    const decision = evaluateLiveMediaErrorRecovery({
      now: 10_000,
      recentErrorTimestamps: [],
      lastRecoveryAt: 0,
      lastErrorTimeSec: null,
      currentTimeSec: 1.31,
      seekableStartSec: 0,
      seekableEndSec: 16.09,
      liveSyncPositionSec: 6.09,
    });

    assert.strictEqual(decision.action, "recover");
    assert.strictEqual(decision.delayMs, 0);
    assert.strictEqual(decision.seekToSec, null);
    assert.deepStrictEqual(decision.nextTimestamps, [10_000]);
  });

  test("2. Repeated MEDIA_ERROR at same startup timestamp enforces cooldown and skips past un-decodable segment", () => {
    const decision = evaluateLiveMediaErrorRecovery({
      now: 10_200,
      recentErrorTimestamps: [10_000],
      lastRecoveryAt: 10_000,
      lastErrorTimeSec: 1.31,
      currentTimeSec: 1.31,
      seekableStartSec: 0,
      seekableEndSec: 16.09,
      liveSyncPositionSec: 6.09,
    });

    assert.strictEqual(decision.action, "recover");
    assert.strictEqual(decision.delayMs, LIVE_MEDIA_RECOVERY_COOLDOWN_MS - 200);
    assert.strictEqual(decision.seekToSec, 6.09);
  });

  test("3. Clamps forward skip inside seekable window even when liveSyncPosition is unavailable", () => {
    const decision = evaluateLiveMediaErrorRecovery({
      now: 11_000,
      recentErrorTimestamps: [10_000],
      lastRecoveryAt: 10_000,
      lastErrorTimeSec: 1.3,
      currentTimeSec: 1.3,
      seekableStartSec: 0,
      seekableEndSec: 7.0,
      liveSyncPositionSec: null,
    });

    assert.strictEqual(decision.action, "recover");
    assert.strictEqual(decision.delayMs, 0);
    assert.strictEqual(decision.seekToSec, 5.5);
  });

  test("4. Third error triggers swap_and_recover and fourth escalates to fallback", () => {
    const third = evaluateLiveMediaErrorRecovery({
      now: 12_000,
      recentErrorTimestamps: [10_000, 11_000],
      lastRecoveryAt: 11_000,
      lastErrorTimeSec: 5.5,
      currentTimeSec: 5.5,
      seekableStartSec: 0,
      seekableEndSec: 16.0,
      liveSyncPositionSec: 6.0,
    });
    assert.strictEqual(third.action, "swap_and_recover");

    const fourth = evaluateLiveMediaErrorRecovery({
      now: 13_000,
      recentErrorTimestamps: third.nextTimestamps,
      lastRecoveryAt: 12_000,
      lastErrorTimeSec: 9.5,
      currentTimeSec: 9.5,
      seekableStartSec: 0,
      seekableEndSec: 16.0,
      liveSyncPositionSec: 10.0,
    });
    assert.strictEqual(fourth.action, "fallback");
    assert.strictEqual(fourth.seekToSec, null);
  });

  test("5. Prunes stale errors outside the rolling recovery window", () => {
    const decision = evaluateLiveMediaErrorRecovery({
      now: 10_000 + LIVE_MEDIA_RECOVERY_WINDOW_MS + 500,
      recentErrorTimestamps: [9_000, 9_500, 10_000],
      lastRecoveryAt: 10_000,
      lastErrorTimeSec: 1.3,
      currentTimeSec: 45.2,
      seekableStartSec: 32,
      seekableEndSec: 48,
      liveSyncPositionSec: 45.2,
    });

    assert.strictEqual(decision.action, "recover");
    assert.strictEqual(decision.delayMs, 0);
    assert.strictEqual(decision.nextTimestamps.length, 1);
  });
});

