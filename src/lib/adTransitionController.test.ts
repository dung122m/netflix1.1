import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  createInitialAdTransitionState,
  isWithinPreAdCaptureWindow,
  startAdTransition,
  endAdTransition,
  updateUserMutePreferenceDuringTransition,
  isAdTransitionTimedOut,
} from "./adTransitionController";

describe("adTransitionController — TC-AD-FLASH-02", () => {
  describe("createInitialAdTransitionState", () => {
    test("returns a clean, inactive initial state", () => {
      const state = createInitialAdTransitionState();
      assert.strictEqual(state.active, false);
      assert.strictEqual(state.targetSeek, 0);
      assert.strictEqual(state.adDuration, 0);
      assert.strictEqual(state.startTime, 0);
      assert.strictEqual(state.savedUserMuted, null);
      assert.strictEqual(state.hasPreAdFrame, false);
    });
  });

  describe("isWithinPreAdCaptureWindow", () => {
    const boundaries = [{ start: 901.44, end: 931.68 }];

    test("returns true when currentTime is within [start - window, start)", () => {
      // 901.44 - 1.5 = 899.94
      assert.strictEqual(isWithinPreAdCaptureWindow(900.0, boundaries, 1.5), true);
      assert.strictEqual(isWithinPreAdCaptureWindow(901.43, boundaries, 1.5), true);
      assert.strictEqual(isWithinPreAdCaptureWindow(899.94, boundaries, 1.5), true);
    });

    test("returns false when currentTime is before the window", () => {
      assert.strictEqual(isWithinPreAdCaptureWindow(899.0, boundaries, 1.5), false);
      assert.strictEqual(isWithinPreAdCaptureWindow(800.0, boundaries, 1.5), false);
    });

    test("returns false when currentTime is at or past the boundary start", () => {
      assert.strictEqual(isWithinPreAdCaptureWindow(901.44, boundaries, 1.5), false);
      assert.strictEqual(isWithinPreAdCaptureWindow(905.0, boundaries, 1.5), false);
    });

    test("handles empty boundaries or invalid times safely", () => {
      assert.strictEqual(isWithinPreAdCaptureWindow(900.0, [], 1.5), false);
      assert.strictEqual(isWithinPreAdCaptureWindow(NaN, boundaries, 1.5), false);
      assert.strictEqual(isWithinPreAdCaptureWindow(-5, boundaries, 1.5), false);
    });
  });

  describe("startAdTransition", () => {
    test("initializes transition and requests element muting while preserving user unmuted state", () => {
      const now = 10000;
      const result = startAdTransition({
        targetSeek: 931.68,
        adDuration: 30,
        currentUserMuted: false, // User was listening with sound
        hasCapturedFrame: true,
        now,
      });

      assert.strictEqual(result.shouldMuteElement, true);
      assert.deepStrictEqual(result.transitionState, {
        active: true,
        targetSeek: 931.68,
        adDuration: 30,
        startTime: 10000,
        savedUserMuted: false,
        hasPreAdFrame: true,
      });
    });

    test("initializes transition properly when user was already muted", () => {
      const result = startAdTransition({
        targetSeek: 931.68,
        adDuration: 30,
        currentUserMuted: true, // User was already muted
        hasCapturedFrame: false,
        now: 15000,
      });

      assert.strictEqual(result.shouldMuteElement, true);
      assert.strictEqual(result.transitionState.savedUserMuted, true);
      assert.strictEqual(result.transitionState.hasPreAdFrame, false);
    });
  });

  describe("endAdTransition", () => {
    test("restores user unmuted state when ending an active transition", () => {
      const activeState = {
        active: true,
        targetSeek: 931.68,
        adDuration: 30,
        startTime: 10000,
        savedUserMuted: false,
        hasPreAdFrame: true,
      };

      const result = endAdTransition(activeState);
      assert.strictEqual(result.restoredMuted, false);
      assert.strictEqual(result.nextState.active, false);
      assert.strictEqual(result.nextState.savedUserMuted, null);
    });

    test("restores user muted state if user was muted originally", () => {
      const activeState = {
        active: true,
        targetSeek: 931.68,
        adDuration: 30,
        startTime: 10000,
        savedUserMuted: true,
        hasPreAdFrame: false,
      };

      const result = endAdTransition(activeState);
      assert.strictEqual(result.restoredMuted, true);
      assert.strictEqual(result.nextState.active, false);
    });

    test("handles null or inactive state safely", () => {
      assert.deepStrictEqual(endAdTransition(null), {
        restoredMuted: null,
        nextState: createInitialAdTransitionState(),
      });

      const inactiveState = createInitialAdTransitionState();
      assert.deepStrictEqual(endAdTransition(inactiveState), {
        restoredMuted: null,
        nextState: createInitialAdTransitionState(),
      });
    });
  });

  describe("updateUserMutePreferenceDuringTransition", () => {
    test("updates saved user mute preference if user toggles mute while transition is active", () => {
      const activeState = {
        active: true,
        targetSeek: 931.68,
        adDuration: 30,
        startTime: 10000,
        savedUserMuted: false,
        hasPreAdFrame: true,
      };

      const updated = updateUserMutePreferenceDuringTransition(activeState, true);
      assert.strictEqual(updated.savedUserMuted, true);

      const ended = endAdTransition(updated);
      assert.strictEqual(ended.restoredMuted, true);
    });

    test("leaves inactive state unmodified", () => {
      const inactive = createInitialAdTransitionState();
      const updated = updateUserMutePreferenceDuringTransition(inactive, true);
      assert.strictEqual(updated.active, false);
    });
  });

  describe("isAdTransitionTimedOut", () => {
    test("returns true when elapsed time exceeds timeout (default 4000ms)", () => {
      const state = {
        active: true,
        targetSeek: 931.68,
        adDuration: 30,
        startTime: 1000,
        savedUserMuted: false,
        hasPreAdFrame: true,
      };

      assert.strictEqual(isAdTransitionTimedOut(state, 4500, 4000), false); // 3500ms elapsed
      assert.strictEqual(isAdTransitionTimedOut(state, 5001, 4000), true); // 4001ms elapsed
    });

    test("returns false if state is null or inactive", () => {
      assert.strictEqual(isAdTransitionTimedOut(null, 5000), false);
      assert.strictEqual(isAdTransitionTimedOut(createInitialAdTransitionState(), 5000), false);
    });
  });
});
