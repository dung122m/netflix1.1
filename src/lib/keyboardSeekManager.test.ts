import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateKeyboardSeek,
  createInitialKeyboardSeekState,
} from "./keyboardSeekManager";

describe("TC-PLAYER-KEYBOARD-SEEK-01 — Keyboard Seek State & Cycle Verification", () => {
  it("Kịch bản 1: Bấm phải một lần → +5s và seek-right", () => {
    const initial = createInitialKeyboardSeekState();
    const result = calculateKeyboardSeek(initial, "ArrowRight", 100, 3600, 1000);

    assert.equal(result.feedbackType, "seek-right");
    assert.equal(result.feedbackText, "+5s");
    assert.equal(result.feedbackSeconds, 5);
    assert.equal(result.targetTime, 105);
    assert.equal(result.nextState.originTime, 100);
    assert.equal(result.nextState.accumulatedDelta, 5);
    assert.equal(result.nextState.direction, "seek-right");
    assert.equal(result.shouldFlushPrevious, false);
  });

  it("Kịch bản 2: Indicator ẩn hoàn toàn (>800ms), bấm phải lần nữa → bắt đầu chu kỳ mới (+5s, không bị +10s)", () => {
    const initial = createInitialKeyboardSeekState();
    // Lần 1: Bấm tại t = 1000ms
    const res1 = calculateKeyboardSeek(initial, "ArrowRight", 100, 3600, 1000);
    assert.equal(res1.feedbackText, "+5s");

    // Giả lập sau khi debounce 250ms chạy xong và indicator ẩn hoàn toàn sau 800ms
    // Playhead video đã cập nhật lên 105s
    // Người dùng bấm lần tiếp theo tại t = 2000ms (1000ms trôi qua > 800ms)
    const res2 = calculateKeyboardSeek(res1.nextState, "ArrowRight", 105, 3600, 2000);

    assert.equal(res2.feedbackType, "seek-right");
    assert.equal(res2.feedbackText, "+5s", "Sau khi indicator ẩn hoàn toàn, lần tua tiếp theo PHẢI là +5s, không được là +10s");
    assert.equal(res2.feedbackSeconds, 5);
    assert.equal(res2.targetTime, 110);
    assert.equal(res2.nextState.originTime, 105);
    assert.equal(res2.nextState.accumulatedDelta, 5);
    assert.equal(res2.shouldFlushPrevious, false);
  });

  it("Kịch bản 3: Bấm phải liên tục trong cùng chu kỳ (<800ms) → cộng dồn đúng (+5s, +10s, +15s)", () => {
    const initial = createInitialKeyboardSeekState();
    // Bấm lần 1 tại t = 1000
    const res1 = calculateKeyboardSeek(initial, "ArrowRight", 50, 3600, 1000);
    assert.equal(res1.feedbackText, "+5s");
    assert.equal(res1.targetTime, 55);

    // Bấm lần 2 tại t = 1150 (cách 150ms < 800ms)
    const res2 = calculateKeyboardSeek(res1.nextState, "ArrowRight", 50, 3600, 1150);
    assert.equal(res2.feedbackText, "+10s");
    assert.equal(res2.targetTime, 60);
    assert.equal(res2.nextState.accumulatedDelta, 10);
    assert.equal(res2.nextState.originTime, 50);

    // Bấm lần 3 tại t = 1300 (cách 150ms < 800ms)
    const res3 = calculateKeyboardSeek(res2.nextState, "ArrowRight", 50, 3600, 1300);
    assert.equal(res3.feedbackText, "+15s");
    assert.equal(res3.targetTime, 65);
    assert.equal(res3.nextState.accumulatedDelta, 15);
    assert.equal(res3.nextState.originTime, 50);

    // Bấm lần 4 tại t = 1600 (cách 300ms < 800ms, debounce 250ms có thể đã seek nhưng indicator vẫn trong chu kỳ 800ms)
    const res4 = calculateKeyboardSeek(res3.nextState, "ArrowRight", 50, 3600, 1600);
    assert.equal(res4.feedbackText, "+20s");
    assert.equal(res4.targetTime, 70);
    assert.equal(res4.nextState.accumulatedDelta, 20);
  });

  it("Kịch bản 4: Tua trái liên tục (<800ms) → hiển thị đúng chiều seek-left và số giây (−5s, −10s, −15s)", () => {
    const initial = createInitialKeyboardSeekState();
    // Bấm lần 1 trái tại t = 1000, video ở 100s
    const res1 = calculateKeyboardSeek(initial, "ArrowLeft", 100, 3600, 1000);
    assert.equal(res1.feedbackType, "seek-left");
    assert.equal(res1.feedbackText, "−5s");
    assert.equal(res1.feedbackSeconds, 5);
    assert.equal(res1.targetTime, 95);

    // Bấm lần 2 trái tại t = 1200
    const res2 = calculateKeyboardSeek(res1.nextState, "ArrowLeft", 100, 3600, 1200);
    assert.equal(res2.feedbackType, "seek-left");
    assert.equal(res2.feedbackText, "−10s");
    assert.equal(res2.feedbackSeconds, 10);
    assert.equal(res2.targetTime, 90);

    // Bấm lần 3 trái tại t = 1400
    const res3 = calculateKeyboardSeek(res2.nextState, "ArrowLeft", 100, 3600, 1400);
    assert.equal(res3.feedbackType, "seek-left");
    assert.equal(res3.feedbackText, "−15s");
    assert.equal(res3.feedbackSeconds, 15);
    assert.equal(res3.targetTime, 85);
  });

  it("Kịch bản 5: Tua phải rồi tua trái → không giữ bộ đếm sai hướng (chuyển ngay sang chu kỳ tua trái)", () => {
    const initial = createInitialKeyboardSeekState();
    // Bấm phải tại t = 1000
    const resRight = calculateKeyboardSeek(initial, "ArrowRight", 100, 3600, 1000);
    assert.equal(resRight.feedbackType, "seek-right");
    assert.equal(resRight.feedbackText, "+5s");
    assert.equal(resRight.targetTime, 105);

    // Ngay sau đó (t = 1100, 100ms sau), người dùng bấm trái!
    const resLeft = calculateKeyboardSeek(resRight.nextState, "ArrowLeft", 100, 3600, 1100);

    // Phải chuyển sang seek-left với −5s, KHÔNG được giữ seek-right và KHÔNG được ra +0s
    assert.equal(resLeft.feedbackType, "seek-left", "Phải đổi icon sang seek-left");
    assert.equal(resLeft.feedbackText, "−5s", "Phải hiển thị −5s thay vì +0s");
    assert.equal(resLeft.nextState.direction, "seek-left");
    assert.equal(resLeft.shouldFlushPrevious, true, "Phải flush lệnh seek phải trước đó để tránh nhảy loạn");
    assert.equal(resLeft.previousTargetToFlush, 105);
    assert.equal(resLeft.targetTime, 100, "Từ 105 vừa tua tới trừ 5s lùi về 100");
  });

  it("Kịch bản 6: Tua trái khi ở mốc 0:00 (hoặc sát đầu video) → kẹp an toàn tại 0, không bị âm và không hiện seek-right", () => {
    const initial = createInitialKeyboardSeekState();
    const result = calculateKeyboardSeek(initial, "ArrowLeft", 0, 3600, 1000);

    assert.equal(result.feedbackType, "seek-left", "Phải hiển thị seek-left, KHÔNG được nhầm sang seek-right");
    assert.equal(result.feedbackText, "0s");
    assert.equal(result.targetTime, 0);
    assert.equal(result.nextState.accumulatedDelta, 0);
  });

  it("Kịch bản 7: Tua phải sát cuối video → kẹp an toàn tại duration, không vượt quá tổng thời lượng", () => {
    const initial = createInitialKeyboardSeekState();
    // Video 100s, hiện tại 96s
    const result = calculateKeyboardSeek(initial, "ArrowRight", 96, 100, 1000);

    assert.equal(result.feedbackType, "seek-right");
    assert.equal(result.targetTime, 100);
    assert.equal(result.feedbackText, "+4s");
    assert.equal(result.nextState.accumulatedDelta, 4);
  });

  it("Kịch bản 8: Xử lý số giây có phần thập phân (e.g. currentTime = 45.342s) → làm tròn delta hiển thị chuẩn xác", () => {
    const initial = createInitialKeyboardSeekState();
    const res1 = calculateKeyboardSeek(initial, "ArrowRight", 45.342, 3600, 1000);

    assert.equal(res1.feedbackText, "+5s");
    assert.equal(Math.round(res1.targetTime * 1000) / 1000, 50.342);

    const res2 = calculateKeyboardSeek(res1.nextState, "ArrowRight", 45.342, 3600, 1150);
    assert.equal(res2.feedbackText, "+10s");
    assert.equal(Math.round(res2.targetTime * 1000) / 1000, 55.342);
  });
});
