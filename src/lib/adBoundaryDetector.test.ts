import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectAdBoundaries, isVerifiedAdSegmentUri, FragmentLike } from "./adBoundaryDetector";

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
  });
});
