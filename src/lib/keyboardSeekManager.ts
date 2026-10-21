/**
 * TC-PLAYER-KEYBOARD-SEEK-01: Keyboard Seek State Manager
 * 
 * Manages cycle-aware keyboard seeking (ArrowLeft / ArrowRight) for CinemaPlayer:
 * 1. Synchronized cycle tracking with the 800ms desktop feedback indicator.
 * 2. Rapid repeated taps or key-repeat within 800ms accumulate (+10s, +20s, +30s / −10s, −20s, −30s).
 * 3. Once indicator hides (after 800ms of inactivity), the cycle expires and next seek starts fresh (+10s).
 * 4. Switching direction (Right -> Left or Left -> Right) immediately starts a fresh cycle in the new direction.
 * 5. Debounce (250ms) separates UI indicator updates from heavy video.currentTime updates.
 */

export const KEYBOARD_SEEK_CYCLE_TIMEOUT_MS = 800;
export const KEYBOARD_SEEK_DEBOUNCE_MS = 250;

export interface KeyboardSeekState {
  originTime: number;
  targetTime: number;
  accumulatedDelta: number;
  direction: "seek-left" | "seek-right" | null;
  lastActionTime: number;
  isDebouncePending: boolean;
}

export interface KeyboardSeekResult {
  nextState: KeyboardSeekState;
  shouldFlushPrevious: boolean;
  previousTargetToFlush?: number;
  feedbackType: "seek-left" | "seek-right";
  feedbackText: string;
  feedbackSeconds: number;
  targetTime: number;
}

export function createInitialKeyboardSeekState(): KeyboardSeekState {
  return {
    originTime: 0,
    targetTime: 0,
    accumulatedDelta: 0,
    direction: null,
    lastActionTime: 0,
    isDebouncePending: false,
  };
}

/**
 * Calculates next seek target, accumulator, and visual feedback based on user keypress.
 */
export function calculateKeyboardSeek(
  currentState: KeyboardSeekState,
  key: "ArrowLeft" | "ArrowRight",
  currentTime: number,
  effectiveDuration: number,
  now: number = Date.now()
): KeyboardSeekResult {
  const dir: "seek-left" | "seek-right" = key === "ArrowRight" ? "seek-right" : "seek-left";
  const stepDelta = key === "ArrowRight" ? 10 : -10;

  // A press belongs to the active cycle IF:
  // 1. Same direction
  // 2. Elapsed time since last action is strictly within the visual indicator lifetime (800ms)
  // 3. Cycle has not been explicitly reset
  const isSameCycle =
    currentState.direction === dir &&
    currentState.lastActionTime > 0 &&
    now - currentState.lastActionTime < KEYBOARD_SEEK_CYCLE_TIMEOUT_MS;

  let shouldFlushPrevious = false;
  let previousTargetToFlush: number | undefined;

  let originTime: number;
  let newTarget: number;
  let accumulatedDelta: number;

  const isDebounceActive =
    currentState.isDebouncePending &&
    currentState.lastActionTime > 0 &&
    now - currentState.lastActionTime < KEYBOARD_SEEK_DEBOUNCE_MS;

  if (isSameCycle) {
    // Continue accumulating in the same direction from the current cycle's origin
    originTime = currentState.originTime;
    const rawTarget = currentState.targetTime + stepDelta;
    newTarget = Math.max(
      0,
      effectiveDuration > 0 ? Math.min(effectiveDuration, rawTarget) : Math.max(0, rawTarget)
    );
    accumulatedDelta = Math.round(newTarget - originTime);
  } else {
    // Starting a fresh cycle (either new seek, expired cycle, or direction change)
    if (isDebounceActive && currentState.direction !== null && currentState.direction !== dir) {
      // Switching direction while previous seek was still in debounce window: flush it first
      shouldFlushPrevious = true;
      previousTargetToFlush = currentState.targetTime;
    }

    // Base origin point for the new cycle:
    // If we had a pending target that is now flushing, seek relative to that target;
    // otherwise use the video's current playhead.
    const baseTime = shouldFlushPrevious && previousTargetToFlush !== undefined
      ? previousTargetToFlush
      : Math.max(0, currentTime || 0);

    originTime = baseTime;
    const rawTarget = baseTime + stepDelta;
    newTarget = Math.max(
      0,
      effectiveDuration > 0 ? Math.min(effectiveDuration, rawTarget) : Math.max(0, rawTarget)
    );
    accumulatedDelta = Math.round(newTarget - originTime);
  }

  // Generate visual feedback
  const absDelta = Math.abs(accumulatedDelta);
  let feedbackText: string;
  if (dir === "seek-right") {
    feedbackText = `+${accumulatedDelta}s`;
  } else {
    feedbackText = accumulatedDelta === 0 ? "0s" : `−${absDelta}s`;
  }

  const nextState: KeyboardSeekState = {
    originTime,
    targetTime: newTarget,
    accumulatedDelta,
    direction: dir,
    lastActionTime: now,
    isDebouncePending: true,
  };

  return {
    nextState,
    shouldFlushPrevious,
    previousTargetToFlush,
    feedbackType: dir,
    feedbackText,
    feedbackSeconds: absDelta,
    targetTime: newTarget,
  };
}
