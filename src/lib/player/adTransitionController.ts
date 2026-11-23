/**
 * adTransitionController.ts
 *
 * TC-AD-FLASH-02 — MINIMAL PATCH: SMOOTH AUTO-SKIP TRANSITION
 *
 * Chịu trách nhiệm:
 * 1. Ngắt tức thì âm thanh quảng cáo khi có quyết định auto-skip hợp lệ,
 *    đồng thời bảo toàn lựa chọn mute ban đầu của người dùng (không làm đổi UI).
 * 2. Hỗ trợ giữ khung hình phim trước quảng cáo (pre-ad frame retention) qua canvas,
 *    ngăn ngừa chớp đen và triệt tiêu khung hình quảng cáo rác bị đơ trong lúc seek.
 * 3. Quản lý vòng đời chuyển tiếp: chỉ kết thúc khi playback thực sự tiếp tục (`playing`),
 *    không chỉ dựa vào `seeked`.
 * 4. Cleanup an toàn khi pause, manual seek, timeout (4s), đổi tập/provider và unmount.
 */

export interface AdTransitionState {
  active: boolean;
  targetSeek: number;
  adDuration: number;
  startTime: number;
  savedUserMuted: boolean | null;
  hasPreAdFrame: boolean;
}

export function createInitialAdTransitionState(): AdTransitionState {
  return {
    active: false,
    targetSeek: 0,
    adDuration: 0,
    startTime: 0,
    savedUserMuted: null,
    hasPreAdFrame: false,
  };
}

/**
 * Kiểm tra xem playhead hiện tại có nằm trong cửa sổ chụp frame trước quảng cáo không.
 * Cửa sổ mặc định: [ad.start - windowSeconds, ad.start).
 */
export function isWithinPreAdCaptureWindow(
  currentTime: number,
  boundaries: { start: number; end: number }[],
  windowSeconds: number = 1.5
): boolean {
  if (!boundaries || boundaries.length === 0 || !isFinite(currentTime) || currentTime < 0) {
    return false;
  }
  return boundaries.some(
    (b) => currentTime >= b.start - windowSeconds && currentTime < b.start
  );
}

/**
 * Bắt đầu chuyển tiếp auto-skip:
 * - Lưu lại trạng thái mute của người dùng.
 * - Tạm ngắt tiếng trên media element (video.muted = true).
 * - Kích hoạt cờ chuyển tiếp.
 */
export function startAdTransition(params: {
  targetSeek: number;
  adDuration: number;
  currentUserMuted: boolean;
  hasCapturedFrame?: boolean;
  now?: number;
}): {
  transitionState: AdTransitionState;
  shouldMuteElement: boolean;
} {
  const now = params.now ?? Date.now();
  return {
    transitionState: {
      active: true,
      targetSeek: params.targetSeek,
      adDuration: params.adDuration,
      startTime: now,
      savedUserMuted: params.currentUserMuted,
      hasPreAdFrame: params.hasCapturedFrame ?? false,
    },
    shouldMuteElement: true,
  };
}

/**
 * Kết thúc hoặc dọn dẹp chuyển tiếp auto-skip (khi video playing, pause, manual seek, timeout, unmount):
 * - Trả về trạng thái mute cần khôi phục cho media element (theo savedUserMuted).
 * - Reset transitionState về rỗng.
 */
export function endAdTransition(currentState: AdTransitionState | null): {
  restoredMuted: boolean | null;
  nextState: AdTransitionState;
} {
  if (!currentState || !currentState.active) {
    return {
      restoredMuted: null,
      nextState: createInitialAdTransitionState(),
    };
  }

  const restoredMuted = currentState.savedUserMuted;
  return {
    restoredMuted,
    nextState: createInitialAdTransitionState(),
  };
}

/**
 * Cập nhật trạng thái mute của người dùng nếu người dùng chủ động bấm mute/unmute
 * trong lúc chuyển tiếp đang diễn ra.
 */
export function updateUserMutePreferenceDuringTransition(
  currentState: AdTransitionState,
  newUserMutePreference: boolean
): AdTransitionState {
  if (!currentState.active) return currentState;
  return {
    ...currentState,
    savedUserMuted: newUserMutePreference,
  };
}

/**
 * Kiểm tra timeout của quá trình chuyển tiếp (quá 4000ms chưa resume playback).
 */
export function isAdTransitionTimedOut(
  currentState: AdTransitionState | null,
  now?: number,
  timeoutMs: number = 4000
): boolean {
  if (!currentState || !currentState.active) return false;
  const currentNow = now ?? Date.now();
  return currentNow - currentState.startTime > timeoutMs;
}
