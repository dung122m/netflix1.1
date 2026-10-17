import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  checkPlayheadAdvancement,
  evaluateBufferProgress,
  evaluateTimeUpdatePlayback,
  evaluateHlsError,
  evaluateStallRecoveryAttempt,
  MIN_PLAYHEAD_ADVANCE_DELTA,
  MAX_STALL_RECOVERY_ATTEMPTS,
  PlayheadState,
} from "./playbackStallController";

describe("playbackStallController — TC-PLAYBACK-STABILITY-03", () => {
  describe("checkPlayheadAdvancement", () => {
    test("detects real forward progress when delta >= threshold", () => {
      const result = checkPlayheadAdvancement(176.78, 176.68, MIN_PLAYHEAD_ADVANCE_DELTA);
      assert.strictEqual(result.hasAdvanced, true);
      assert.strictEqual(result.newPlayheadTime, 176.78);
    });

    test("detects stalled playhead when delta < threshold (micro-jitter or frozen)", () => {
      const result = checkPlayheadAdvancement(176.70, 176.68, MIN_PLAYHEAD_ADVANCE_DELTA);
      assert.strictEqual(result.hasAdvanced, false);
      assert.strictEqual(result.newPlayheadTime, 176.68);
    });

    test("detects completely frozen playhead (same timestamp)", () => {
      const result = checkPlayheadAdvancement(176.68, 176.68, MIN_PLAYHEAD_ADVANCE_DELTA);
      assert.strictEqual(result.hasAdvanced, false);
      assert.strictEqual(result.newPlayheadTime, 176.68);
    });
  });

  describe("evaluateBufferProgress — Progress event during stall", () => {
    test("KEEPS isBuffering = true when buffer chunks arrive but playhead is stalled", () => {
      const state: PlayheadState = {
        currentTime: 176.68,
        lastPlayheadTime: 176.68,
        isStalled: true,
        isBuffering: true,
        bufAhead: 4.5, // Dù đã tải trước 4.5s
        readyState: 4, // HAVE_ENOUGH_DATA
        isNearEnd: false,
        isPaused: false,
        isEnded: false,
        hasStartedInitialPlayback: true,
      };

      const result = evaluateBufferProgress(state);

      // QUAN TRỌNG: isBuffering PHẢI GIỮ LÀ TRUE!
      // Không được tắt spinner chỉ vì có buffer trong khi playhead vẫn đứng yên
      assert.strictEqual(result.isBuffering, true, "Spinner must stay visible while playhead is frozen");
      assert.strictEqual(result.isStalled, true);
      assert.strictEqual(result.shouldRequestPlay, true, "Should request play() to resume pipeline");
    });

    test("Does NOT request play if buffer ahead is insufficient during stall", () => {
      const state: PlayheadState = {
        currentTime: 176.68,
        lastPlayheadTime: 176.68,
        isStalled: true,
        isBuffering: true,
        bufAhead: 0.8, // Buffer quá mỏng (< 2.5s)
        readyState: 2, // HAVE_CURRENT_DATA
        isNearEnd: false,
        isPaused: false,
        isEnded: false,
        hasStartedInitialPlayback: true,
      };

      const result = evaluateBufferProgress(state);

      assert.strictEqual(result.isBuffering, true);
      assert.strictEqual(result.isStalled, true);
      assert.strictEqual(result.shouldRequestPlay, false);
    });

    test("Turns off isBuffering when user deliberately paused video", () => {
      const state: PlayheadState = {
        currentTime: 176.68,
        lastPlayheadTime: 176.68,
        isStalled: true,
        isBuffering: true,
        bufAhead: 5.0,
        readyState: 4,
        isNearEnd: false,
        isPaused: true,
        isEnded: false,
        hasStartedInitialPlayback: true,
      };

      const result = evaluateBufferProgress(state);

      assert.strictEqual(result.isBuffering, false);
      assert.strictEqual(result.isStalled, false);
      assert.strictEqual(result.shouldRequestPlay, false);
    });
  });

  describe("evaluateTimeUpdatePlayback — Playback recovery verification", () => {
    test("turns off isBuffering and isStalled when playhead actually advances", () => {
      const state: PlayheadState = {
        currentTime: 177.10, // Đã tiến từ 176.68 lên 177.10 (> 0.08s)
        lastPlayheadTime: 176.68,
        isStalled: true,
        isBuffering: true,
        bufAhead: 4.0,
        readyState: 4,
        isNearEnd: false,
        isPaused: false,
        isEnded: false,
        hasStartedInitialPlayback: true,
      };

      const result = evaluateTimeUpdatePlayback(state);

      assert.strictEqual(result.hasAdvanced, true);
      assert.strictEqual(result.isBuffering, false, "Spinner must turn off when playhead genuinely moves");
      assert.strictEqual(result.isStalled, false);
      assert.strictEqual(result.newPlayheadTime, 177.10);
    });

    test("MAINTAINS isBuffering = true if timeupdate fires but currentTime has NOT advanced", () => {
      const state: PlayheadState = {
        currentTime: 176.68, // Vẫn ở đúng mốc cũ
        lastPlayheadTime: 176.68,
        isStalled: true,
        isBuffering: true,
        bufAhead: 3.5,
        readyState: 3,
        isNearEnd: false,
        isPaused: false,
        isEnded: false,
        hasStartedInitialPlayback: true,
      };

      const result = evaluateTimeUpdatePlayback(state);

      assert.strictEqual(result.hasAdvanced, false);
      assert.strictEqual(result.isBuffering, true, "Must NOT de-buffer when currentTime is frozen");
      assert.strictEqual(result.isStalled, true);
      assert.strictEqual(result.newPlayheadTime, 176.68);
    });
  });

  describe("evaluateHlsError — HLS.js v1.7.2 error handling", () => {
    test("identifies non-fatal BUFFER_STALLED_ERROR as stall requiring buffering", () => {
      const result = evaluateHlsError({
        fatal: false,
        details: "bufferStalledError",
        type: "mediaError",
      });

      assert.strictEqual(result.isBufferStalled, true);
      assert.strictEqual(result.shouldMarkStalled, true);
      assert.strictEqual(result.isFatal, false);
    });

    test("ignores non-fatal fragLoadError so Hls.js internal retry works undisturbed", () => {
      const result = evaluateHlsError({
        fatal: false,
        details: "fragLoadError",
        type: "networkError",
      });

      assert.strictEqual(result.isBufferStalled, false);
      assert.strictEqual(result.shouldMarkStalled, false);
      assert.strictEqual(result.isFatal, false);
    });

    test("flags fatal error appropriately", () => {
      const result = evaluateHlsError({
        fatal: true,
        details: "manifestLoadError",
        type: "networkError",
      });

      assert.strictEqual(result.isFatal, true);
      assert.strictEqual(result.isBufferStalled, false);
      assert.strictEqual(result.shouldMarkStalled, false);
    });
  });

  describe("evaluateStallRecoveryAttempt — Retry loop protection", () => {
    test("allows retry on attempt 0 with play request", () => {
      const result = evaluateStallRecoveryAttempt(0, 2.0, MAX_STALL_RECOVERY_ATTEMPTS);
      assert.strictEqual(result.canRetry, true);
      assert.strictEqual(result.shouldRequestPlay, true);
      assert.strictEqual(result.shouldKeepBuffering, true);
    });

    test("suggests micro-nudge when buffer is right ahead (gap between 0.05s and 0.5s)", () => {
      const result = evaluateStallRecoveryAttempt(0, 0.2, MAX_STALL_RECOVERY_ATTEMPTS);
      assert.strictEqual(result.canRetry, true);
      assert.strictEqual(result.shouldNudge, true);
      assert.strictEqual(result.nudgeDelta, 0.1);
    });

    test("stops retry loop when max attempts reached to avoid crashing media engine", () => {
      const result = evaluateStallRecoveryAttempt(2, 3.0, MAX_STALL_RECOVERY_ATTEMPTS);
      assert.strictEqual(result.canRetry, false);
      assert.strictEqual(result.shouldRequestPlay, false);
      assert.strictEqual(result.shouldNudge, false);
      assert.strictEqual(result.shouldKeepBuffering, false, "Clears spinner when buffer exists but engine cannot play");
    });

    test("keeps buffering spinner if buffer is completely empty even after max attempts", () => {
      const result = evaluateStallRecoveryAttempt(2, 0.1, MAX_STALL_RECOVERY_ATTEMPTS);
      assert.strictEqual(result.canRetry, false);
      assert.strictEqual(result.shouldRequestPlay, false);
      assert.strictEqual(result.shouldKeepBuffering, true, "Keeps spinner because network is still starved");
    });
  });
});
