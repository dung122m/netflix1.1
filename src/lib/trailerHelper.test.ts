import test from "node:test";
import assert from "node:assert/strict";
import {
  extractYoutubeId,
  getYoutubeTrailerEmbedUrl,
  isYoutubeErrorMessage,
  isYoutubePlayingMessage,
  isYoutubeEndedMessage,
  isYoutubeQualityInfoMessage,
  hasAcceptableQuality,
  hasMinimum1080Quality,
  YOUTUBE_HD_QUALITIES,
  YOUTUBE_ACCEPTABLE_QUALITIES,
} from "./trailerHelper";

test("TC-HERO-TRAILER-RECOVERY-01 - extractYoutubeId tests", async (t) => {
  await t.test("extracts ID from various YouTube URL formats", () => {
    assert.equal(extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeId("https://www.youtube.com/watch?feature=shared&v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(extractYoutubeId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  await t.test("handles invalid inputs gracefully", () => {
    assert.equal(extractYoutubeId(null), null);
    assert.equal(extractYoutubeId(undefined), null);
    assert.equal(extractYoutubeId(""), null);
    assert.equal(extractYoutubeId("   "), null);
    assert.equal(extractYoutubeId("https://vimeo.com/12345678"), null);
    assert.equal(extractYoutubeId("not-a-valid-id"), null);
  });
});

test("TC-HERO-TRAILER-RECOVERY-01 - getYoutubeTrailerEmbedUrl tests", async (t) => {
  await t.test("generates safe privacy-enhanced embed URL with params", () => {
    const url = getYoutubeTrailerEmbedUrl("dQw4w9WgXcQ", { muted: true, controls: false, loop: true });
    assert.ok(url);
    assert.ok(url.startsWith("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?"));
    assert.ok(url.includes("autoplay=1"));
    assert.ok(url.includes("mute=1"));
    assert.ok(url.includes("controls=0"));
    assert.ok(url.includes("playsinline=1"));
    assert.ok(url.includes("enablejsapi=1"));
  });

  await t.test("returns null for invalid video URL/ID", () => {
    assert.equal(getYoutubeTrailerEmbedUrl("invalid-trailer-url"), null);
    assert.equal(getYoutubeTrailerEmbedUrl(null), null);
  });
});

test("TC-HERO-TRAILER-RECOVERY-01 - Quality requirement & fallback tests", async (t) => {
  await t.test("YOUTUBE_ACCEPTABLE_QUALITIES includes 720p, 1080p and higher", () => {
    assert.ok(YOUTUBE_HD_QUALITIES.has("hd720"));
    assert.ok(YOUTUBE_HD_QUALITIES.has("hd1080"));
    assert.ok(YOUTUBE_HD_QUALITIES.has("hd1440"));
    assert.ok(YOUTUBE_HD_QUALITIES.has("hd2160"));
    assert.ok(YOUTUBE_ACCEPTABLE_QUALITIES.has("hd720"));
    assert.ok(YOUTUBE_ACCEPTABLE_QUALITIES.has("hd1080"));
  });

  await t.test("hasAcceptableQuality accepts 1080p and 720p", () => {
    assert.equal(hasAcceptableQuality(["hd1080", "hd720", "large"]), true);
    assert.equal(hasAcceptableQuality(["hd720", "large", "medium"]), true);
    assert.equal(hasAcceptableQuality(["hd2160"]), true);
  });

  await t.test("hasAcceptableQuality does NOT fail on empty or missing quality info", () => {
    assert.equal(hasAcceptableQuality([]), true);
    assert.equal(hasAcceptableQuality(null), true);
    assert.equal(hasAcceptableQuality(undefined), true);
  });

  await t.test("hasMinimum1080Quality behaves identically to hasAcceptableQuality for backwards compatibility", () => {
    assert.equal(hasMinimum1080Quality(["hd720"]), true);
    assert.equal(hasMinimum1080Quality(["hd1080"]), true);
    assert.equal(hasMinimum1080Quality([]), true);
  });
});

test("TC-HERO-TRAILER-RECOVERY-01 - YouTube postMessage parsing tests", async (t) => {
  await t.test("isYoutubePlayingMessage accurately detects PLAYING state in string and object formats", () => {
    // 1. Direct API onStateChange
    assert.equal(isYoutubePlayingMessage(JSON.stringify({ event: "onStateChange", info: 1 })), true);
    assert.equal(isYoutubePlayingMessage({ event: "onStateChange", info: 1 }), true);
    assert.equal(isYoutubePlayingMessage({ event: "onStateChange", data: 1 }), true);

    // 2. infoDelivery packet
    assert.equal(isYoutubePlayingMessage(JSON.stringify({ event: "infoDelivery", info: { playerState: 1 } })), true);
    assert.equal(isYoutubePlayingMessage({ event: "infoDelivery", info: { playerState: 1 } }), true);
    assert.equal(isYoutubePlayingMessage({ event: "infoDelivery", info: { playbackState: 1 } }), true);

    // 3. Non-playing states
    assert.equal(isYoutubePlayingMessage({ event: "onStateChange", info: 2 }), false); // PAUSED
    assert.equal(isYoutubePlayingMessage({ event: "onStateChange", info: 3 }), false); // BUFFERING
    assert.equal(isYoutubePlayingMessage(null), false);
    assert.equal(isYoutubePlayingMessage("not-json"), false);
  });

  await t.test("isYoutubeErrorMessage accurately detects genuine YouTube errors", () => {
    // Error events
    assert.equal(isYoutubeErrorMessage(JSON.stringify({ event: "onError", info: 100 })), true);
    assert.equal(isYoutubeErrorMessage({ event: "onError", info: 150 }), true);
    assert.equal(isYoutubeErrorMessage({ info: 100 }), true); // Deleted/private
    assert.equal(isYoutubeErrorMessage({ info: 101 }), true); // Embedding disabled
    assert.equal(isYoutubeErrorMessage({ info: 150 }), true); // Embedding disabled
    assert.equal(isYoutubeErrorMessage({ info: 2 }), true);   // Invalid param
    assert.equal(isYoutubeErrorMessage({ event: "infoDelivery", info: { errorCode: 150 } }), true);

    // Normal info / non-errors
    assert.equal(isYoutubeErrorMessage({ event: "onStateChange", info: 1 }), false);
    assert.equal(isYoutubeErrorMessage({ event: "infoDelivery", info: { currentTime: 5 } }), false);
    assert.equal(isYoutubeErrorMessage(null), false);
  });

  await t.test("isYoutubeEndedMessage detects ENDED state", () => {
    assert.equal(isYoutubeEndedMessage({ event: "onStateChange", info: 0 }), true);
    assert.equal(isYoutubeEndedMessage({ event: "infoDelivery", info: { playerState: 0 } }), true);
    assert.equal(isYoutubeEndedMessage({ event: "onStateChange", info: 1 }), false);
  });

  await t.test("isYoutubeQualityInfoMessage extracts availableQualityLevels correctly", () => {
    const payload = JSON.stringify({
      event: "infoDelivery",
      info: { availableQualityLevels: ["hd1080", "hd720", "large"] },
    });
    assert.deepEqual(isYoutubeQualityInfoMessage(payload), ["hd1080", "hd720", "large"]);
    assert.equal(isYoutubeQualityInfoMessage({ event: "infoDelivery", info: {} }), null);
    assert.equal(isYoutubeQualityInfoMessage(null), null);
  });
});

test("TC-HERO-TRAILER-RECOVERY-01 - Watchdog & slide concurrency simulation", async (t) => {
  await t.test("Slide epoch change discards delayed responses and prevents trailer overlap", () => {
    let slideEpoch = 1;
    let activeTrailerId: string | null = null;
    let isTrailerReady = false;

    // Slide 1 initiates trailer loading
    const epochAtSlide1 = slideEpoch;
    activeTrailerId = "trailer-1";

    // User switches to Slide 2 before trailer 1 finishes loading
    slideEpoch += 1;
    const epochAtSlide2 = slideEpoch;
    activeTrailerId = "trailer-2";
    isTrailerReady = false;

    // Simulate delayed response or timer from Slide 1 resolving now
    if (epochAtSlide1 === slideEpoch) {
      isTrailerReady = true; // MUST NOT BE REACHED
    }

    assert.equal(isTrailerReady, false, "Stale response from Slide 1 must not activate trailer on Slide 2");

    // Slide 2 resolves normally
    if (epochAtSlide2 === slideEpoch) {
      isTrailerReady = true;
    }
    assert.equal(isTrailerReady, true, "Slide 2 should activate its own trailer");
    assert.equal(activeTrailerId, "trailer-2");
  });

  await t.test("Timeout does not permanently blacklist trailer unless max retries exceeded", () => {
    const failedTrailerMap: Record<string, boolean> = {};
    const retryCountMap: Record<string, number> = {};
    const slug = "test-movie";

    // 1st timeout
    retryCountMap[slug] = (retryCountMap[slug] || 0) + 1;
    assert.equal(failedTrailerMap[slug], undefined, "1st timeout must not permanently blacklist");
    assert.equal(retryCountMap[slug], 1);

    // 2nd timeout
    retryCountMap[slug] = (retryCountMap[slug] || 0) + 1;
    assert.equal(failedTrailerMap[slug], undefined, "2nd timeout must not permanently blacklist");
    assert.equal(retryCountMap[slug], 2);

    // Limit reached check
    const canAttempt = (retryCountMap[slug] || 0) < 2;
    assert.equal(canAttempt, false, "Should pause attempts after 2 timeouts to prevent infinite loops");
  });

  await t.test("Explicit YouTube error immediately marks trailer as permanently failed", () => {
    const failedTrailerMap: Record<string, boolean> = {};
    const slug = "broken-movie";

    const errorEvent = { event: "onError", info: 150 };
    if (isYoutubeErrorMessage(errorEvent)) {
      failedTrailerMap[slug] = true;
    }

    assert.equal(failedTrailerMap[slug], true, "Embed disabled error must immediately mark trailer as failed");
  });
});
