/**
 * playbackStallController.ts
 *
 * TC-PLAYBACK-STABILITY-03 — PATCH 1: BUFFERING UI & HLS STALL RECOVERY
 *
 * Chịu trách nhiệm:
 * 1. Phân biệt playhead thực sự tiến lên (advancing) với trường hợp playhead bị đứng hình (stuck/frozen)
 *    dù browser vẫn nhận buffer chunk qua sự kiện `progress`.
 * 2. Ngăn ngừa việc tắt spinner (isBuffering = false) quá sớm khi video chưa thực sự giải mã & phát tiếp.
 * 3. Xử lý riêng BUFFER_STALLED_ERROR non-fatal của Hls.js v1.7.2, tránh kích hoạt recovery bừa bãi với các lỗi non-fatal khác.
 * 4. Kiểm soát số lần phục hồi (stall recovery attempts) để tránh vòng lặp recovery vô hạn hoặc gọi play() liên tục.
 */

export interface PlayheadState {
  currentTime: number;
  lastPlayheadTime: number;
  isStalled: boolean;
  isBuffering: boolean;
  bufAhead: number;
  readyState: number;
  isNearEnd: boolean;
  isPaused: boolean;
  isEnded: boolean;
  hasStartedInitialPlayback: boolean;
}

/**
 * Ngưỡng tối thiểu (giây) để xác nhận playhead thực sự tiến lên,
 * tránh nhiễu do sai số microsecond của video.currentTime.
 */
export const MIN_PLAYHEAD_ADVANCE_DELTA = 0.08;

/**
 * Đánh giá tiến độ của playhead dựa trên timeupdate.
 */
export function checkPlayheadAdvancement(
  currentTime: number,
  lastPlayheadTime: number,
  threshold: number = MIN_PLAYHEAD_ADVANCE_DELTA
): { hasAdvanced: boolean; newPlayheadTime: number } {
  if (!isFinite(currentTime) || currentTime < 0) {
    return { hasAdvanced: false, newPlayheadTime: lastPlayheadTime };
  }

  const forwardDelta = currentTime - lastPlayheadTime;
  const hasAdvanced = forwardDelta >= threshold;

  return {
    hasAdvanced,
    newPlayheadTime: hasAdvanced ? currentTime : lastPlayheadTime,
  };
}

/**
 * Đánh giá phản ứng khi nhận sự kiện `progress` hoặc `canplay`.
 *
 * NGUYÊN TẮC CỐT LÕI (TC-PLAYBACK-STABILITY-03):
 * - Khi đang stall, việc buffer tải thêm (bufAhead >= 2.5s) CHỈ ĐỦ ĐIỀU KIỆN để gọi video.play()
 *   đánh thức pipeline giải mã.
 * - TUYỆT ĐỐI KHÔNG tự tắt `isBuffering` (spinner) ở đây!
 * - Spinner chỉ được tắt khi sự kiện `playing` nổ ra hoặc playhead thực sự nhích lên qua `timeupdate`.
 */
export function evaluateBufferProgress(state: PlayheadState): {
  isBuffering: boolean;
  isStalled: boolean;
  shouldRequestPlay: boolean;
} {
  // Nếu video đang pause hoặc ended do chủ ý người dùng, không can thiệp
  if (state.isPaused || state.isEnded) {
    return {
      isBuffering: false,
      isStalled: false,
      shouldRequestPlay: false,
    };
  }

  // Chưa hoàn thành initial buffering
  if (!state.hasStartedInitialPlayback) {
    const isReadyForInitial = state.bufAhead >= 8 || state.isNearEnd;
    return {
      isBuffering: !isReadyForInitial,
      isStalled: !isReadyForInitial,
      shouldRequestPlay: isReadyForInitial,
    };
  }

  // Nếu đang stall
  if (state.isStalled) {
    const hasResumableData = state.readyState >= 3 || state.bufAhead >= 2.5 || state.isNearEnd;
    return {
      // GIỮ NGUYÊN isBuffering: true! Spinner tiếp tục hiển thị vì playhead chưa tiến lên
      isBuffering: true,
      isStalled: true,
      // Đủ dữ liệu đệm thì gửi tín hiệu play() để trình duyệt bắt đầu nạp frame
      shouldRequestPlay: hasResumableData,
    };
  }

  return {
    isBuffering: state.isBuffering,
    isStalled: false,
    shouldRequestPlay: false,
  };
}

/**
 * Đánh giá khi nhận sự kiện `timeupdate`.
 * Nếu playhead đã thực sự tiến lên và video không bị tạm dừng:
 * Xác nhận playback đã phục hồi thật sự -> Tắt isBuffering và isStalled!
 */
export function evaluateTimeUpdatePlayback(state: PlayheadState): {
  isBuffering: boolean;
  isStalled: boolean;
  hasAdvanced: boolean;
  newPlayheadTime: number;
} {
  const { hasAdvanced, newPlayheadTime } = checkPlayheadAdvancement(
    state.currentTime,
    state.lastPlayheadTime
  );

  if (hasAdvanced && !state.isPaused && !state.isEnded) {
    // Playhead thực sự chạy: xác nhận phục hồi hoàn toàn
    return {
      isBuffering: false,
      isStalled: false,
      hasAdvanced: true,
      newPlayheadTime,
    };
  }

  // Playhead đứng yên (currentTime không đổi): giữ nguyên trạng thái buffering hiện tại
  return {
    isBuffering: state.isBuffering,
    isStalled: state.isStalled,
    hasAdvanced: false,
    newPlayheadTime: state.lastPlayheadTime,
  };
}

/**
 * Đánh giá sự kiện lỗi từ HLS.js (Hls.Events.ERROR).
 * Phân biệt BUFFER_STALLED_ERROR (cần đánh dấu stall + buffering) với các lỗi khác.
 * Tránh trigger recovery bừa bãi với các lỗi non-fatal thông thường.
 */
export function evaluateHlsError(data: {
  fatal: boolean;
  details?: string;
  type?: string;
}): {
  isBufferStalled: boolean;
  shouldMarkStalled: boolean;
  isFatal: boolean;
} {
  if (data.fatal) {
    return {
      isBufferStalled: false,
      shouldMarkStalled: false,
      isFatal: true,
    };
  }

  // Non-fatal BUFFER_STALLED_ERROR
  if (data.details === "bufferStalledError") {
    return {
      isBufferStalled: true,
      shouldMarkStalled: true,
      isFatal: false,
    };
  }

  // Các lỗi non-fatal khác (ví dụ: fragLoadError retry mà Hls.js tự xử lý)
  return {
    isBufferStalled: false,
    shouldMarkStalled: false,
    isFatal: false,
  };
}

/**
 * Kiểm soát số lần retry stall recovery để tránh vòng lặp vô hạn hoặc spam play().
 */
export const MAX_STALL_RECOVERY_ATTEMPTS = 2;

export function evaluateStallRecoveryAttempt(
  currentAttempts: number,
  bufAhead: number,
  maxAttempts: number = MAX_STALL_RECOVERY_ATTEMPTS
): {
  canRetry: boolean;
  shouldRequestPlay: boolean;
  shouldNudge: boolean;
  nudgeDelta: number;
  shouldKeepBuffering: boolean;
} {
  if (currentAttempts < maxAttempts) {
    // Nếu có buffer phía trước nhưng playhead bị kẹt ở micro-gap (0.05s đến 0.5s)
    const shouldNudge = bufAhead > 0.05 && bufAhead < 0.5;
    return {
      canRetry: true,
      shouldRequestPlay: true,
      shouldNudge,
      nudgeDelta: shouldNudge ? 0.1 : 0,
      shouldKeepBuffering: true,
    };
  }

  // Đã vượt quá số lần retry cho phép: dừng gọi play() để tránh crash media engine
  return {
    canRetry: false,
    shouldRequestPlay: false,
    shouldNudge: false,
    nudgeDelta: 0,
    // Nếu buffer rỗng hẳn thì vẫn để buffering chờ mạng, nếu có buffer thì tắt spinner tránh treo vĩnh viễn
    shouldKeepBuffering: bufAhead < 0.5,
  };
}
