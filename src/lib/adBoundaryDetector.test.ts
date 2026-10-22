import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectAdBoundaries,
  isVerifiedAdSegmentUri,
  FragmentLike,
  evaluateAutoAdSkipDecision,
  evaluatePreRollAdDecision,
  SAFE_AD_SKIP_OFFSET,
  calculateSafeAdSkipTarget,
  snapTimePastAdBoundaries,
} from "./adBoundaryDetector";

describe("adBoundaryDetector", () => {
  describe("isVerifiedAdSegmentUri", () => {
    it("should match convertv7 and convertv8 formats", () => {
      assert.equal(isVerifiedAdSegmentUri("convertv7/vxrUERLE.ts"), true);
      assert.equal(isVerifiedAdSegmentUri("convertv8/pd18WfS4.ts"), true);
      assert.equal(isVerifiedAdSegmentUri("https://cdn.example.com/hls/convertv7/test.ts"), true);
    });

    it("should match md5 subfolder segment formats", () => {
      assert.equal(isVerifiedAdSegmentUri("/v7/d61a03b1dabe537cc05ffe5c9c280f56/segment_0001.ts"), true);
      assert.equal(isVerifiedAdSegmentUri("/d61a03b1dabe537cc05ffe5c9c280f56/segment_0011.ts"), true);
    });

    it("should NOT match normal movie segments", () => {
      assert.equal(isVerifiedAdSegmentUri("8gmeb6jM.ts"), false);
      assert.equal(isVerifiedAdSegmentUri("UiDZDTpY.ts"), false);
      assert.equal(isVerifiedAdSegmentUri("b253m8t8.ts"), false);
      assert.equal(isVerifiedAdSegmentUri("movie_ep01_0001.ts"), false);
      assert.equal(isVerifiedAdSegmentUri(""), false);
      assert.equal(isVerifiedAdSegmentUri(undefined), false);
    });
  });

  describe("detectAdBoundaries", () => {
    it("returns empty array for empty, single, or invalid inputs", () => {
      assert.deepEqual(detectAdBoundaries([]), []);
      assert.deepEqual(detectAdBoundaries([{ url: "convertv7/ad.ts", cc: 1, duration: 15 }]), []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.deepEqual(detectAdBoundaries(null as any), []);
    });

    it("detects verified ad block from thuong-nguyen-do (Khối 1: 6 segments, ~25.04s)", () => {
      // Mocked sequence matching line 91-118 of thuong-nguyen-do
      const fragments: FragmentLike[] = [
        { relurl: "8gmeb6jM.ts", cc: 0, start: 175.32, duration: 2.52 },
        // Ad block (cc increments to 1)
        { relurl: "convertv7/vxrUERLE.ts", cc: 1, start: 177.84, duration: 3.68 },
        { relurl: "convertv7/2grgYcC3.ts", cc: 1, start: 181.52, duration: 3.96 },
        { relurl: "convertv7/YFSmAMDu.ts", cc: 1, start: 185.48, duration: 4.48 },
        { relurl: "convertv7/6BnAPKH6.ts", cc: 1, start: 189.96, duration: 4.08 },
        { relurl: "convertv7/Lb4S93Z7.ts", cc: 1, start: 194.04, duration: 3.76 },
        { relurl: "convertv7/tsB5AMG2.ts", cc: 1, start: 197.80, duration: 5.08 },
        // Movie resumes (cc increments to 2)
        { relurl: "UiDZDTpY.ts", cc: 2, start: 202.88, duration: 5.2 },
        { relurl: "8j2IGJVN.ts", cc: 2, start: 208.08, duration: 2.36 },
      ];

      const detected = detectAdBoundaries(fragments);
      assert.equal(detected.length, 1);
      assert.equal(detected[0].startIndex, 1);
      assert.equal(detected[0].endIndex, 6);
      assert.equal(detected[0].start, 177.84);
      assert.equal(detected[0].duration, 25.04);
      assert.equal(detected[0].end, 202.88);
    });

    it("detects pre-roll ad block starting at 0:00 (tro-lai-tuoi-18 sample)", () => {
      const fragments: FragmentLike[] = [
        // Pre-roll ad at start
        { relurl: "convertv7/intro1.ts", cc: 0, start: 0.0, duration: 8.0 },
        { relurl: "convertv7/intro2.ts", cc: 0, start: 8.0, duration: 9.0 },
        { relurl: "convertv7/intro3.ts", cc: 0, start: 17.0, duration: 9.0 },
        // Movie resumes at cc = 1
        { relurl: "movie01.ts", cc: 1, start: 26.0, duration: 4.0 },
        { relurl: "movie02.ts", cc: 1, start: 30.0, duration: 4.0 },
      ];

      const detected = detectAdBoundaries(fragments);
      assert.equal(detected.length, 1);
      assert.equal(detected[0].start, 0.0);
      assert.equal(detected[0].duration, 26.0);
      assert.equal(detected[0].end, 26.0);
    });

    it("detects multiple distinct ad blocks (pre-roll and mid-roll)", () => {
      const fragments: FragmentLike[] = [
        { relurl: "convertv8/intro1.ts", cc: 0, start: 0, duration: 15 },
        { relurl: "movie01.ts", cc: 1, start: 15, duration: 100 },
        { relurl: "movie02.ts", cc: 1, start: 115, duration: 100 },
        // Mid-roll
        { relurl: "/v7/d61a03b1dabe537cc05ffe5c9c280f56/segment_0001.ts", cc: 2, start: 215, duration: 15 },
        { relurl: "/v7/d61a03b1dabe537cc05ffe5c9c280f56/segment_0002.ts", cc: 2, start: 230, duration: 15 },
        // Movie resumes
        { relurl: "movie03.ts", cc: 3, start: 245, duration: 100 },
      ];

      const detected = detectAdBoundaries(fragments);
      assert.equal(detected.length, 2);
      assert.equal(detected[0].start, 0);
      assert.equal(detected[0].end, 15);
      assert.equal(detected[1].start, 215);
      assert.equal(detected[1].end, 245);
    });

    it("returns empty array for clean stream without ads (vision-quest sample)", () => {
      const fragments: FragmentLike[] = [
        { relurl: "pD1jsW6Z_000.ts", cc: 0, start: 0, duration: 4.0 },
        { relurl: "pD1jsW6Z_001.ts", cc: 0, start: 4.0, duration: 4.0 },
        { relurl: "pD1jsW6Z_002.ts", cc: 0, start: 8.0, duration: 4.0 },
        { relurl: "pD1jsW6Z_003.ts", cc: 0, start: 12.0, duration: 4.0 },
      ];

      const detected = detectAdBoundaries(fragments);
      assert.deepEqual(detected, [], "Must not find ads in clean stream");
    });

    it("rejects normal movie discontinuity (non-ad URI paths)", () => {
      const fragments: FragmentLike[] = [
        { relurl: "movie_part1_01.ts", cc: 0, start: 0, duration: 10 },
        // Discontinuity between movie scenes or reels, but normal movie path
        { relurl: "movie_part2_01.ts", cc: 1, start: 10, duration: 20 },
        { relurl: "movie_part2_02.ts", cc: 1, start: 30, duration: 20 },
      ];

      const detected = detectAdBoundaries(fragments);
      assert.deepEqual(detected, [], "Must ignore non-ad discontinuity");
    });

    it("rejects ad block exceeding 65.0s maximum duration constraint", () => {
      const fragments: FragmentLike[] = [
        { relurl: "movie01.ts", cc: 0, start: 0, duration: 10 },
        // Long block 80s matching convertv7 -> rejected
        { relurl: "convertv7/long1.ts", cc: 1, start: 10, duration: 40 },
        { relurl: "convertv7/long2.ts", cc: 1, start: 50, duration: 40 },
        { relurl: "movie02.ts", cc: 2, start: 90, duration: 10 },
      ];

      const detected = detectAdBoundaries(fragments);
      assert.deepEqual(detected, [], "Must reject blocks longer than 65s");
    });

    it("rejects ad block under 10.0s minimum duration constraint", () => {
      const fragments: FragmentLike[] = [
        { relurl: "movie01.ts", cc: 0, start: 0, duration: 10 },
        // Micro block 5s -> rejected
        { relurl: "convertv7/short.ts", cc: 1, start: 10, duration: 5 },
        { relurl: "movie02.ts", cc: 2, start: 15, duration: 10 },
      ];

      const detected = detectAdBoundaries(fragments);
      assert.deepEqual(detected, [], "Must reject blocks shorter than 10s");
    });

    it("rejects if discontinuity is missing between movie and ad", () => {
      const fragments: FragmentLike[] = [
        { relurl: "movie01.ts", cc: 0, start: 0, duration: 10 },
        // No cc change! (cc is still 0)
        { relurl: "convertv7/ad1.ts", cc: 0, start: 10, duration: 15 },
        { relurl: "movie02.ts", cc: 0, start: 25, duration: 10 },
      ];

      const detected = detectAdBoundaries(fragments);
      assert.deepEqual(detected, [], "Must reject when cc discontinuity is missing");
    });

    it("rejects overlay sponsorship block with internal discontinuities (Conan Ep 26 sample at 176.68s)", () => {
      // Mocked sequence matching Conan Episode 26 where 9 segments have fragmented cc (1, 3, 5, 7, 9...)
      const fragments: FragmentLike[] = [
        { relurl: "DROkHBL6.ts", cc: 0, start: 173.68, duration: 3.0 },
        // Overlay sponsor banner block with internal discontinuities (spliced movie cuts)
        { relurl: "convertv7/UkaQSjAn.ts", cc: 1, start: 176.68, duration: 3.8 },
        { relurl: "convertv7/isjA2ev6.ts", cc: 3, start: 180.48, duration: 1.48 },
        { relurl: "convertv7/kLiUPmPe.ts", cc: 5, start: 181.96, duration: 2.96 },
        { relurl: "convertv7/hEo3UUFX.ts", cc: 7, start: 184.92, duration: 2.84 },
        { relurl: "convertv7/srlqVEZR.ts", cc: 9, start: 187.76, duration: 3.56 },
        { relurl: "convertv7/mqx9lBgM.ts", cc: 11, start: 191.32, duration: 2.24 },
        { relurl: "convertv7/wqEdsuJo.ts", cc: 13, start: 193.56, duration: 2.4 },
        { relurl: "convertv7/FFdzdhWZ.ts", cc: 15, start: 195.96, duration: 3.0 },
        { relurl: "convertv7/LaUHakOE.ts", cc: 17, start: 198.96, duration: 2.96 },
        // Movie resumes
        { relurl: "qjZn4nDK.ts", cc: 18, start: 201.92, duration: 3.48 },
      ];

      const detected = detectAdBoundaries(fragments);
      assert.deepEqual(detected, [], "Must reject overlay sponsorship blocks with internal discontinuities to preserve movie content");
    });

    it("detects verified standalone commercial block with uniform cc (Conan Ep 26 sample at 901.44s)", () => {
      const fragments: FragmentLike[] = [
        { relurl: "movie_before.ts", cc: 18, start: 898.0, duration: 3.44 },
        // Standalone MD5 commercial clip with uniform cc=19
        { relurl: "/v7/d61a03b1dabe537cc05ffe5c9c280f56/segment_0001.ts", cc: 19, start: 901.44, duration: 15.0 },
        { relurl: "/v7/d61a03b1dabe537cc05ffe5c9c280f56/segment_0002.ts", cc: 19, start: 916.44, duration: 15.24 },
        // Movie resumes
        { relurl: "movie_after.ts", cc: 20, start: 931.68, duration: 3.0 },
      ];

      const detected = detectAdBoundaries(fragments);
      assert.equal(detected.length, 1);
      assert.equal(detected[0].start, 901.44);
      assert.equal(detected[0].end, 931.68);
      assert.equal(detected[0].duration, 30.24);
    });
  });

  describe("evaluateAutoAdSkipDecision — Execution Pathway Protection", () => {
    it("does NOT trigger auto-seek for Conan Ep 26 overlay sequence at 176.680s (preserves story content)", () => {
      // Vì detectAdBoundaries loại bỏ khối overlay 176.68s, danh sách boundaries không chứa khối này
      const verifiedBoundaries = [
        { start: 901.44, end: 931.68, duration: 30.24, startIndex: 300, endIndex: 302 },
      ];
      const hasSkipped = new Set<string>();

      // Khi playhead chạy qua mốc 176.680s đến 201.920s
      for (const time of [176.68, 180.0, 190.5, 201.9]) {
        const decision = evaluateAutoAdSkipDecision({
          currentTime: time,
          boundaries: verifiedBoundaries,
          hasSkippedSet: hasSkipped,
          lastSkipTime: 0,
          now: 100000,
        });

        assert.strictEqual(decision, null, `Must NOT auto-seek at time ${time}s because it is movie footage`);
      }
    });

    it("triggers auto-seek to ad.end for verified standalone commercial at 901.44s", () => {
      const verifiedBoundaries = [
        { start: 901.44, end: 931.68, duration: 30.24, startIndex: 300, endIndex: 302 },
      ];
      const hasSkipped = new Set<string>();

      const decision = evaluateAutoAdSkipDecision({
        currentTime: 901.44,
        boundaries: verifiedBoundaries,
        hasSkippedSet: hasSkipped,
        lastSkipTime: 0,
        now: 100000,
      });

      assert.notStrictEqual(decision, null);
      assert.strictEqual(decision?.shouldSeek, true);
      assert.strictEqual(decision?.targetSeek, 931.68);
      assert.strictEqual(decision?.adDuration, 30);
      assert.strictEqual(hasSkipped.has("901.44_931.68"), true, "Must mark adKey as skipped");
    });

    it("does not re-seek on subsequent timeupdates once skipped (prevents seek thrashing)", () => {
      const verifiedBoundaries = [
        { start: 901.44, end: 931.68, duration: 30.24, startIndex: 300, endIndex: 302 },
      ];
      const hasSkipped = new Set<string>(["901.44_931.68"]);

      const decision = evaluateAutoAdSkipDecision({
        currentTime: 915.0,
        boundaries: verifiedBoundaries,
        hasSkippedSet: hasSkipped,
        lastSkipTime: 95000,
        now: 100000,
      });

      assert.strictEqual(decision, null, "Should not seek again if already skipped");
    });

    it("resets skip state when user rewinds past ad.start - 2", () => {
      const verifiedBoundaries = [
        { start: 901.44, end: 931.68, duration: 30.24, startIndex: 300, endIndex: 302 },
      ];
      const hasSkipped = new Set<string>(["901.44_931.68"]);

      const decision = evaluateAutoAdSkipDecision({
        currentTime: 890.0, // Tua về trước 901.44 - 2 = 899.44s
        boundaries: verifiedBoundaries,
        hasSkippedSet: hasSkipped,
        lastSkipTime: 95000,
        now: 100000,
      });

      assert.strictEqual(decision, null);
      assert.strictEqual(hasSkipped.has("901.44_931.68"), false, "Must clear adKey so future playback can auto-skip");
    });

    it("does NOT seek when video is seeking, paused, or ended", () => {
      const verifiedBoundaries = [
        { start: 901.44, end: 931.68, duration: 30.24, startIndex: 300, endIndex: 302 },
      ];

      assert.strictEqual(
        evaluateAutoAdSkipDecision({
          currentTime: 901.5,
          boundaries: verifiedBoundaries,
          hasSkippedSet: new Set(),
          lastSkipTime: 0,
          isSeeking: true,
        }),
        null,
        "Must not seek during active seeking"
      );

      assert.strictEqual(
        evaluateAutoAdSkipDecision({
          currentTime: 901.5,
          boundaries: verifiedBoundaries,
          hasSkippedSet: new Set(),
          lastSkipTime: 0,
          isPaused: true,
        }),
        null,
        "Must not seek when video is paused"
      );

      assert.strictEqual(
        evaluateAutoAdSkipDecision({
          currentTime: 901.5,
          boundaries: verifiedBoundaries,
          hasSkippedSet: new Set(),
          lastSkipTime: 0,
          isEnded: true,
        }),
        null,
        "Must not seek when video is ended"
      );
    });

    it("does NOT seek when throttled within 2000ms", () => {
      const verifiedBoundaries = [
        { start: 901.44, end: 931.68, duration: 30.24, startIndex: 300, endIndex: 302 },
      ];

      const decision = evaluateAutoAdSkipDecision({
        currentTime: 901.5,
        boundaries: verifiedBoundaries,
        hasSkippedSet: new Set(),
        lastSkipTime: 100000,
        now: 101000, // Chỉ mới 1000ms trôi qua (< 2000ms)
      });

      assert.strictEqual(decision, null, "Must throttle repeat skip within 2s");
    });

    it("triggers early seek before ad.start when leadTime is specified (P1 - Zero-Flash early trigger)", () => {
      const verifiedBoundaries = [
        { start: 901.44, end: 931.68, duration: 30.24, startIndex: 300, endIndex: 302 },
      ];
      const hasSkipped = new Set<string>();

      // Playhead ở 901.20s (trước ad.start 901.44s là 0.24s). Với leadTime = 0.25s, ngưỡng là 901.19s
      const earlyDecision = evaluateAutoAdSkipDecision({
        currentTime: 901.20,
        boundaries: verifiedBoundaries,
        hasSkippedSet: hasSkipped,
        lastSkipTime: 0,
        leadTime: 0.25,
      });

      assert.notStrictEqual(earlyDecision, null, "Must trigger early seek before ad.start");
      assert.strictEqual(earlyDecision?.shouldSeek, true);
      assert.strictEqual(earlyDecision?.targetSeek, 931.68);

      // Nếu playhead ở 901.00s (cách 0.44s, vượt quá leadTime 0.25s), không được trigger
      const notYetSkipped = new Set<string>();
      const tooEarlyDecision = evaluateAutoAdSkipDecision({
        currentTime: 901.00,
        boundaries: verifiedBoundaries,
        hasSkippedSet: notYetSkipped,
        lastSkipTime: 0,
        leadTime: 0.25,
      });
      assert.strictEqual(tooEarlyDecision, null, "Must NOT trigger when playhead is before leadTime window");
    });
  });

  describe("evaluatePreRollAdDecision — P0 Zero-Flash Pre-roll Protection", () => {
    const preRollBoundaries = [
      { start: 0.0, end: 26.0, duration: 26.0, startIndex: 0, endIndex: 3 },
      { start: 500.0, end: 530.0, duration: 30.0, startIndex: 100, endIndex: 103 },
    ];

    it("triggers pre-roll skip when starting fresh from beginning (targetProgress = 0)", () => {
      const decision = evaluatePreRollAdDecision({
        targetProgress: 0,
        hasStartedInitialPlayback: false,
        boundaries: preRollBoundaries,
      });

      assert.notStrictEqual(decision, null);
      assert.strictEqual(decision?.shouldSkipPreRoll, true);
      assert.strictEqual(decision?.targetSeek, 26.0);
      assert.strictEqual(decision?.adDuration, 26);
      assert.strictEqual(decision?.adKey, "0_26");
    });

    it("does NOT trigger pre-roll skip when user resumes from saved progress (targetProgress > 0)", () => {
      const decision = evaluatePreRollAdDecision({
        targetProgress: 350.0,
        hasStartedInitialPlayback: false,
        boundaries: preRollBoundaries,
      });

      assert.strictEqual(decision, null, "Must preserve user resume target");
    });

    it("does NOT trigger pre-roll skip if initial playback has already started", () => {
      const decision = evaluatePreRollAdDecision({
        targetProgress: 0,
        hasStartedInitialPlayback: true,
        boundaries: preRollBoundaries,
      });

      assert.strictEqual(decision, null, "Must not interfere with ongoing playback");
    });

    it("does NOT trigger pre-roll skip if first ad is not at start (mid-roll only)", () => {
      const midRollOnly = [
        { start: 120.0, end: 150.0, duration: 30.0, startIndex: 20, endIndex: 23 },
      ];
      const decision = evaluatePreRollAdDecision({
        targetProgress: 0,
        hasStartedInitialPlayback: false,
        boundaries: midRollOnly,
      });

      assert.strictEqual(decision, null, "Must not skip when no pre-roll ad exists at 0:00");
    });

    it("handles empty or invalid boundaries safely", () => {
      assert.strictEqual(
        evaluatePreRollAdDecision({
          targetProgress: 0,
          hasStartedInitialPlayback: false,
          boundaries: [],
        }),
        null
      );
      assert.strictEqual(
        evaluatePreRollAdDecision({
          targetProgress: 0,
          hasStartedInitialPlayback: false,
          boundaries: null as unknown as import("./adBoundaryDetector").AdBoundary[],
        }),
        null
      );
    });
  });

  describe("TC-AD-SKIP-BOUNDARY-01 — calculateSafeAdSkipTarget & SAFE_AD_SKIP_OFFSET", () => {
    it("adds SAFE_AD_SKIP_OFFSET (0.35s) by default to ad.end", () => {
      const target = calculateSafeAdSkipTarget(202.88);
      assert.equal(target, 203.23);
    });

    it("clamps target to maxDuration - 0.5s if target would exceed video duration", () => {
      // Ví dụ video kết thúc ở 100s, ad.end là 99.8s -> 99.8 + 0.35 = 100.15s (vượt quá video)
      const clamped = calculateSafeAdSkipTarget(99.8, [], 100);
      assert.equal(clamped, 99.5);
    });

    it("handles multiple consecutive ad blocks (chaining)", () => {
      // 2 khối ad liền kề nhau:
      // Block 1: 100s -> 115s
      // Block 2: 115.2s -> 130s
      const boundaries = [
        { start: 100, end: 115, duration: 15, startIndex: 10, endIndex: 12 },
        { start: 115.2, end: 130, duration: 14.8, startIndex: 13, endIndex: 15 },
      ];
      // Nếu nhảy qua Block 1 với offset: 115 + 0.35 = 115.35s (rơi vào Block 2)
      // Hàm phải tự động phát hiện và nhảy qua tiếp Block 2 -> 130 + 0.35 = 130.35s
      const chainedTarget = calculateSafeAdSkipTarget(115, boundaries, 1000);
      assert.equal(chainedTarget, 130.35);
    });

    it("handles invalid or negative adEnd safely", () => {
      assert.equal(calculateSafeAdSkipTarget(-5), 0);
      assert.equal(calculateSafeAdSkipTarget(NaN), 0);
    });
  });

  describe("TC-AD-SKIP-BOUNDARY-01 — snapTimePastAdBoundaries (Manual Seek Snapping)", () => {
    const sampleBoundaries = [
      { start: 100.0, end: 120.0, duration: 20.0, startIndex: 10, endIndex: 13 },
      { start: 500.0, end: 525.0, duration: 25.0, startIndex: 50, endIndex: 54 },
    ];

    it("snaps manual seek inside ad [100, 120) to safe target after ad (120.35s)", () => {
      // Người dùng tua tới 105s (giữa khối quảng cáo)
      const snap = snapTimePastAdBoundaries(105.0, sampleBoundaries, 1000);
      assert.strictEqual(snap.snapped, true);
      assert.strictEqual(snap.adjustedTime, 120.35);
      assert.strictEqual(snap.adKey, "100_120");
      assert.strictEqual(snap.adDuration, 20);
    });

    it("does NOT snap when seek landing is outside ads", () => {
      // Tua tới 50s (trước ad 1)
      const snapBefore = snapTimePastAdBoundaries(50.0, sampleBoundaries, 1000);
      assert.strictEqual(snapBefore.snapped, false);
      assert.strictEqual(snapBefore.adjustedTime, 50.0);

      // Tua tới 150s (giữa ad 1 và ad 2)
      const snapBetween = snapTimePastAdBoundaries(150.0, sampleBoundaries, 1000);
      assert.strictEqual(snapBetween.snapped, false);
      assert.strictEqual(snapBetween.adjustedTime, 150.0);
    });

    it("handles boundary edge conditions safely (inclusive [ad.start, ad.end] vs past ad.end)", () => {
      // Đúng tại ad.start (100.0s) -> snap
      const snapAtStart = snapTimePastAdBoundaries(100.0, sampleBoundaries, 1000);
      assert.strictEqual(snapAtStart.snapped, true);
      assert.strictEqual(snapAtStart.adjustedTime, 120.35);

      // Tại ad.end (120.0s) -> nằm trong [ad.start, ad.end], snap an toàn sang vị trí sau ad
      const snapAtEnd = snapTimePastAdBoundaries(120.0, sampleBoundaries, 1000);
      assert.strictEqual(snapAtEnd.snapped, true);
      assert.strictEqual(snapAtEnd.adjustedTime, 120.35);

      // Sau ad.end (120.5s) -> đã ngoài ad, không snap
      const snapPastEnd = snapTimePastAdBoundaries(120.5, sampleBoundaries, 1000);
      assert.strictEqual(snapPastEnd.snapped, false);
      assert.strictEqual(snapPastEnd.adjustedTime, 120.5);
    });

    it("handles empty or invalid boundaries safely without throwing", () => {
      assert.deepEqual(snapTimePastAdBoundaries(105, []), {
        snapped: false,
        adjustedTime: 105,
        adKey: null,
        adDuration: 0,
      });
      assert.deepEqual(snapTimePastAdBoundaries(105, undefined), {
        snapped: false,
        adjustedTime: 105,
        adKey: null,
        adDuration: 0,
      });
    });
  });

  describe("TC-AD-SKIP-BOUNDARY-01 — Auto Skip with safeOffset regression", () => {
    const verifiedBoundaries = [
      { start: 901.44, end: 931.68, duration: 30.24, startIndex: 300, endIndex: 302 },
    ];

    it("applies safeOffset when passed to evaluateAutoAdSkipDecision", () => {
      const hasSkipped = new Set<string>();
      const decision = evaluateAutoAdSkipDecision({
        currentTime: 901.44,
        boundaries: verifiedBoundaries,
        hasSkippedSet: hasSkipped,
        lastSkipTime: 0,
        safeOffset: SAFE_AD_SKIP_OFFSET,
        maxDuration: 2000,
      });

      assert.notStrictEqual(decision, null);
      assert.strictEqual(decision?.shouldSeek, true);
      // 931.68 + 0.35 = 932.03
      assert.strictEqual(decision?.targetSeek, 932.03);
    });

    it("applies safeOffset when passed to evaluatePreRollAdDecision", () => {
      const preRollBoundaries = [
        { start: 0.0, end: 26.0, duration: 26.0, startIndex: 0, endIndex: 3 },
      ];
      const decision = evaluatePreRollAdDecision({
        targetProgress: 0,
        hasStartedInitialPlayback: false,
        boundaries: preRollBoundaries,
        safeOffset: SAFE_AD_SKIP_OFFSET,
        maxDuration: 2000,
      });

      assert.notStrictEqual(decision, null);
      assert.strictEqual(decision?.shouldSkipPreRoll, true);
      // 26.0 + 0.35 = 26.35
      assert.strictEqual(decision?.targetSeek, 26.35);
    });
  });

  describe("TC-AD-SKIP-BOUNDARY-01 — Comprehensive Edge Cases & Async Seek Regression", () => {
    const multiAdBoundaries = [
      { start: 200.0, end: 230.0, duration: 30.0, startIndex: 20, endIndex: 25 },
      { start: 230.2, end: 260.0, duration: 29.8, startIndex: 26, endIndex: 31 }, // Chained ad block
      { start: 800.0, end: 840.0, duration: 40.0, startIndex: 80, endIndex: 88 },
      { start: 990.0, end: 1000.0, duration: 10.0, startIndex: 95, endIndex: 99 }, // Near end of video
    ];

    it("snaps manual seek into the very end of an ad block (e.g. ad.end - 0.05s)", () => {
      // 229.95s (trước đây bị sót do điều kiện < ad.end - 0.25)
      const snap = snapTimePastAdBoundaries(229.95, multiAdBoundaries, 1000);
      assert.strictEqual(snap.snapped, true);
      // Khi snap qua khối 1 (230s + 0.35 = 230.35s), điểm rơi lại nằm trong khối 2 (230.2 -> 260s)
      // Hàm phải tự động chain qua tiếp khối 2 -> 260 + 0.35 = 260.35s
      assert.strictEqual(snap.adjustedTime, 260.35);
    });

    it("handles multiple consecutive ad blocks (chaining) during manual seek", () => {
      // Người dùng tua tới 215s (giữa khối 1)
      const snap = snapTimePastAdBoundaries(215.0, multiAdBoundaries, 1000);
      assert.strictEqual(snap.snapped, true);
      assert.strictEqual(snap.adjustedTime, 260.35);
      assert.strictEqual(snap.adKey, "200_230");
    });

    it("prevents overshooting past end of video when ad is near maxDuration", () => {
      // Video dài 1000s, ad kết thúc tại 1000s
      // 1000 + 0.35 = 1000.35s -> Phải được clamp về max(0, maxDuration - 0.5) = 999.5s
      const snapNearEnd = snapTimePastAdBoundaries(995.0, multiAdBoundaries, 1000);
      assert.strictEqual(snapNearEnd.snapped, true);
      assert.strictEqual(snapNearEnd.adjustedTime, 999.5);
    });

    it("handles seek failures and invalid inputs gracefully without throwing", () => {
      assert.strictEqual(snapTimePastAdBoundaries(-10, multiAdBoundaries).snapped, false);
      assert.strictEqual(snapTimePastAdBoundaries(NaN, multiAdBoundaries).snapped, false);
      assert.strictEqual(snapTimePastAdBoundaries(Infinity, multiAdBoundaries).snapped, false);
      assert.strictEqual(calculateSafeAdSkipTarget(-5, multiAdBoundaries, 100), 0);
      assert.strictEqual(calculateSafeAdSkipTarget(0, multiAdBoundaries, 100), 0.35);
    });

    it("ensures evaluateAutoAdSkipDecision detects ads even at ad.end - 0.1s", () => {
      const hasSkipped = new Set<string>();
      const decision = evaluateAutoAdSkipDecision({
        currentTime: 229.9,
        boundaries: multiAdBoundaries,
        hasSkippedSet: hasSkipped,
        lastSkipTime: 0,
        safeOffset: SAFE_AD_SKIP_OFFSET,
        maxDuration: 1000,
      });

      assert.notStrictEqual(decision, null);
      assert.strictEqual(decision?.shouldSeek, true);
      // Phải chain qua cả khối 2 thành 260.35
      assert.strictEqual(decision?.targetSeek, 260.35);
    });

    it("simulates async seek: seeking landing inside ad must always snap regardless of hasSkipped history", () => {
      // Giả lập lịch sử đã từng skip ad này trước đó
      const hasSkipped = new Set<string>(["200_230"]);
      assert.strictEqual(hasSkipped.size, 1);

      // Người dùng tua thủ công quay lại 210s (giữa ad 1)
      const snap = snapTimePastAdBoundaries(210.0, multiAdBoundaries, 1000);
      // snapTimePastAdBoundaries không phụ thuộc vào hasSkipped, luôn snap an toàn
      assert.strictEqual(snap.snapped, true);
      assert.strictEqual(snap.adjustedTime, 260.35);

      // Trong player, manual seek flow không được chặn snap chỉ vì hasSkipped đã có key
      const canSnapOnManualSeek = snap.snapped && snap.adKey !== null;
      assert.strictEqual(canSnapOnManualSeek, true);
    });
  });

  describe("TC-AD-SKIP-BOUNDARY-01 — Unified Seek & Boundary Rules Enforcement", () => {
    const adList = [
      { start: 100.0, end: 125.0, duration: 25.0, startIndex: 10, endIndex: 15 },
      { start: 300.0, end: 320.0, duration: 20.0, startIndex: 30, endIndex: 34 },
      { start: 320.2, end: 340.0, duration: 19.8, startIndex: 35, endIndex: 39 }, // Chained ad 2
      { start: 340.1, end: 360.0, duration: 19.9, startIndex: 40, endIndex: 44 }, // Chained ad 3
    ];

    describe("1. Tua tiến (+10s hoặc forward seek)", () => {
      it("tua tiến rơi vào giữa vùng [ad.start, ad.end] -> tự động chuyển đến vị trí an toàn sau quảng cáo", () => {
        // Đang ở 95s, bấm +10s -> đích đến là 105s (nằm trong [100, 125])
        const target = 105.0;
        const result = snapTimePastAdBoundaries(target, adList, 1000);
        assert.strictEqual(result.snapped, true);
        assert.strictEqual(result.adjustedTime, 125.35); // 125 + 0.35s
        assert.strictEqual(result.adKey, "100_125");
      });

      it("tua tiến rơi đúng mốc ranh giới [ad.start] hoặc [ad.end] -> luôn snap an toàn sau quảng cáo", () => {
        // Đích đến đúng tại ad.start (100.0s)
        const atStart = snapTimePastAdBoundaries(100.0, adList, 1000);
        assert.strictEqual(atStart.snapped, true);
        assert.strictEqual(atStart.adjustedTime, 125.35);

        // Đích đến đúng tại ad.end (125.0s)
        const atEnd = snapTimePastAdBoundaries(125.0, adList, 1000);
        assert.strictEqual(atEnd.snapped, true);
        assert.strictEqual(atEnd.adjustedTime, 125.35);
      });

      it("tua tiến đến nội dung phim hợp lệ ngoài quảng cáo -> giữ nguyên vị trí, không snap", () => {
        // Đang ở 80s, bấm +10s -> 90s (trước ad.start 100s)
        const result = snapTimePastAdBoundaries(90.0, adList, 1000);
        assert.strictEqual(result.snapped, false);
        assert.strictEqual(result.adjustedTime, 90.0);
      });
    });

    describe("2. Tua lùi (-10s hoặc backward seek)", () => {
      it("chỉ skip khi điểm đích thực sự nằm trong vùng quảng cáo [ad.start, ad.end]", () => {
        // Đang ở 130s (sau quảng cáo), bấm -10s -> đích đến 120s (nằm trong [100, 125])
        const targetInAd = 120.0;
        const result = snapTimePastAdBoundaries(targetInAd, adList, 1000);
        assert.strictEqual(result.snapped, true, "Phải snap vì điểm đích rơi vào vùng quảng cáo");
        assert.strictEqual(result.adjustedTime, 125.35);
      });

      it("KHÔNG tự động đẩy người dùng tiến lên nếu họ tua về nội dung phim hợp lệ trước quảng cáo", () => {
        // Đang ở 130s, tua lùi mạnh về 80s (nội dung phim trước quảng cáo 100s)
        const targetBeforeAd = 80.0;
        const result = snapTimePastAdBoundaries(targetBeforeAd, adList, 1000);
        assert.strictEqual(result.snapped, false, "Tuyệt đối không đẩy tiến lên nếu điểm đích là nội dung hợp lệ trước quảng cáo");
        assert.strictEqual(result.adjustedTime, 80.0, "Phải giữ nguyên 80s cho người dùng");
      });

      it("tua lùi về trước ad.start - 2 khôi phục trạng thái skip cho chu kỳ phát tiếp theo", () => {
        const hasSkipped = new Set<string>(["100_125"]);
        // Giả lập tua lùi về 85s (< 100 - 2 = 98s)
        evaluateAutoAdSkipDecision({
          currentTime: 85.0,
          boundaries: adList,
          hasSkippedSet: hasSkipped,
          lastSkipTime: 100000,
          now: 200000,
        });

        assert.strictEqual(hasSkipped.has("100_125"), false, "Phải xóa adKey để sẵn sàng auto-skip khi phim phát lại đến 100s");
      });
    });

    describe("3. Kéo và thả thanh tiến trình (ScrubBar Scrubbing)", () => {
      it("thả thanh tiến trình vào giữa quảng cáo [ad.start, ad.end] -> lập tức chuyển vị trí an toàn sau quảng cáo", () => {
        const scrubbedTarget = 112.5;
        const result = snapTimePastAdBoundaries(scrubbedTarget, adList, 1000);
        assert.strictEqual(result.snapped, true);
        assert.strictEqual(result.adjustedTime, 125.35);
      });

      it("thả thanh tiến trình vào bất kỳ vị trí nội dung phim hợp lệ -> giữ nguyên", () => {
        for (const validTime of [50.0, 99.0, 126.0, 250.0]) {
          const result = snapTimePastAdBoundaries(validTime, adList, 1000);
          assert.strictEqual(result.snapped, false);
          assert.strictEqual(result.adjustedTime, validTime);
        }
      });
    });

    describe("4. Quảng cáo liên tiếp (Consecutive / Chained Ad Blocks)", () => {
      it("nhảy qua chuỗi 3 khối quảng cáo liên tiếp (300s -> 320s -> 340s -> 360s)", () => {
        // Tua rơi vào khối 1 (305s). Sau khối 1 là 320.35s (rơi vào khối 2), sau khối 2 là 340.35s (rơi vào khối 3)
        // Hệ thống phải tự động chain qua cả 3 khối và đáp an toàn ở 360.35s
        const chainedResult = snapTimePastAdBoundaries(305.0, adList, 1000);
        assert.strictEqual(chainedResult.snapped, true);
        assert.strictEqual(chainedResult.adjustedTime, 360.35);
      });

      it("giới hạn vòng lặp (iterations < 5) ngăn chặn seek vô hạn ngay cả khi danh sách boundary bị vòng lặp dữ liệu", () => {
        // Giả lập danh sách boundary dị thường lặp lại
        const cyclicBoundaries = [
          { start: 50.0, end: 50.2, duration: 15.0, startIndex: 1, endIndex: 2 },
          { start: 50.4, end: 50.6, duration: 15.0, startIndex: 3, endIndex: 4 },
        ];
        // Không bị treo hoặc đơ CPU
        const target = calculateSafeAdSkipTarget(50.0, cyclicBoundaries, 1000);
        assert.ok(isFinite(target));
        assert.ok(target > 50.0);
      });

      it("kẹp an toàn mốc thời gian không vượt quá maxDuration - 0.5s", () => {
        const nearEndAds = [
          { start: 980.0, end: 999.8, duration: 19.8, startIndex: 90, endIndex: 95 },
        ];
        // 999.8 + 0.35 = 1000.15s (vượt quá video 1000s) -> phải kẹp về 999.5s
        const target = calculateSafeAdSkipTarget(999.8, nearEndAds, 1000.0);
        assert.strictEqual(target, 999.5);
      });
    });

    describe("5. Phân biệt Programmatic Seek vs User Seek", () => {
      it("xác nhận cờ isProgrammaticAdSkip bảo vệ ad transition và ngăn chặn event collision", () => {
        let isProgrammaticSeek = false;
        let isUserSeek = false;

        // Mô phỏng hàm seek thống nhất:
        const performUnifiedSeek = (targetTime: number, programmatic: boolean) => {
          const snap = snapTimePastAdBoundaries(targetTime, adList, 1000);
          if (snap.snapped) {
            // Khi phát hiện rơi vào quảng cáo, luôn coi là programmatic ad skip để bảo vệ transition
            isProgrammaticSeek = true;
            isUserSeek = false;
            return snap.adjustedTime;
          }
          isProgrammaticSeek = programmatic;
          isUserSeek = !programmatic;
          return targetTime;
        };

        // User tua vào quảng cáo (110s) -> Phải tự động chuyển sang chế độ programmatic skip
        const adjusted = performUnifiedSeek(110.0, false);
        assert.strictEqual(adjusted, 125.35);
        assert.strictEqual(isProgrammaticSeek, true);
        assert.strictEqual(isUserSeek, false);

        // User tua ra ngoài phim hợp lệ (80s) -> Ghi nhận đúng là user seek
        const normalUserSeek = performUnifiedSeek(80.0, false);
        assert.strictEqual(normalUserSeek, 80.0);
        assert.strictEqual(isProgrammaticSeek, false);
        assert.strictEqual(isUserSeek, true);
      });
    });
  });

  describe("TC-AD-SKIP-RESIDUAL-1S-01 — Elimination of 1s Residual Ad via Verified nextStart Segment Boundaries", () => {
    it("populates nextStart in detectAdBoundaries when following movie fragment exists", () => {
      const fragments = [
        { url: "movie_01.ts", cc: 0, duration: 10, start: 0 },
        { url: "movie_02.ts", cc: 0, duration: 10, start: 10 },
        // Ad block (15s):
        { url: "convertv7/ad_01.ts", cc: 1, duration: 5, start: 20 },
        { url: "convertv7/ad_02.ts", cc: 1, duration: 5, start: 25 },
        { url: "convertv7/ad_03.ts", cc: 1, duration: 5, start: 30 },
        // Movie resumes at cc: 2, start: 35.0000000000005
        { url: "movie_03.ts", cc: 2, duration: 10, start: 35.0000000000005 },
        { url: "movie_04.ts", cc: 2, duration: 10, start: 45.0000000000005 },
      ];

      const detected = detectAdBoundaries(fragments);
      assert.strictEqual(detected.length, 1);
      assert.strictEqual(detected[0].start, 20);
      assert.strictEqual(detected[0].end, 35);
      assert.strictEqual(detected[0].duration, 15);
      assert.strictEqual(detected[0].startIndex, 2);
      assert.strictEqual(detected[0].endIndex, 4);
      assert.strictEqual(detected[0].nextStart, 35.0000000000005);
    });

    it("calculates safe target using nextStart + safeOffset (>= 0.45s) to eliminate residual ad audio", () => {
      const boundariesWithNextStart = [
        {
          start: 900.4,
          end: 930.64,
          duration: 30.24,
          startIndex: 225,
          endIndex: 235,
          nextStart: 930.6400000000006,
        },
      ];

      // Khi có nextStart, calculateSafeAdSkipTarget phải nhảy qua điểm baseBoundary với offset an toàn (931.14s)
      // để triệt tiêu hoàn toàn audio packet đuôi quảng cáo (ví dụ tiếng "9922.com")
      const target = calculateSafeAdSkipTarget(930.64, boundariesWithNextStart, 2000, 0.5);
      assert.strictEqual(target, 931.14);
      assert.strictEqual(target > 930.6400000000006, true, "Target must be strictly greater than nextStart");
    });

    it("reproduces and resolves Conan Episode 31 Server 1 scenario (minute 15 ad)", () => {
      // Dữ liệu thực tế từ luồng HLS của Conan Tập 31 Server 1
      const conan31Boundary = [
        {
          start: 900.4,
          end: 930.64,
          duration: 30.24,
          startIndex: 225,
          endIndex: 235,
          nextStart: 930.6400000000006, // OwlqcdyT.ts start time
        },
      ];
      const hasSkipped = new Set<string>();

      // Khi phát hiện đến mốc phút 15 (900.4s)
      const decision = evaluateAutoAdSkipDecision({
        currentTime: 900.4,
        boundaries: conan31Boundary,
        hasSkippedSet: hasSkipped,
        lastSkipTime: 0,
        now: 100000,
        leadTime: 0.35,
        safeOffset: 0.5,
        maxDuration: 1500,
      });

      assert.notStrictEqual(decision, null);
      assert.strictEqual(decision?.shouldSeek, true);
      // Quyết định tự động seek qua ranh giới an toàn của OwlqcdyT.ts
      assert.strictEqual(decision?.targetSeek, 931.14);
      assert.strictEqual(hasSkipped.has("900.4_930.64"), true);

      // Tua thủ công vào giữa quảng cáo Conan 31 cũng snap chính xác sang OwlqcdyT.ts an toàn
      const snap = snapTimePastAdBoundaries(915.0, conan31Boundary, 1500, 0.5);
      assert.strictEqual(snap.snapped, true);
      assert.strictEqual(snap.adjustedTime, 931.14);
    });

    it("falls back safely to safeOffset when nextStart is not available (backwards compatibility)", () => {
      const mockBoundaries = [
        { start: 100, end: 120, duration: 20, startIndex: 10, endIndex: 12 },
      ];
      const target = calculateSafeAdSkipTarget(120, mockBoundaries, 500, 0.35);
      assert.strictEqual(target, 120.35);
    });
  });
});




