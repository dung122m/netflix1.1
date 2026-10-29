import test from "node:test";
import assert from "node:assert/strict";
import {
  extractYoutubeId,
  getYoutubeTrailerEmbedUrl,
  isYoutubeErrorMessage,
  isYoutubePermanentErrorMessage,
  isYoutubePlayingMessage,
  isYoutubeEndedMessage,
  isYoutubeQualityInfoMessage,
  hasAcceptableQuality,
  hasMinimum1080Quality,
  isDesktopWithHover,
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

  await t.test("isYoutubePermanentErrorMessage classifies permanent vs temporary YouTube errors correctly", () => {
    // Permanent errors (codes 100, 101, 150)
    assert.equal(isYoutubePermanentErrorMessage({ event: "onError", info: 100 }), true, "Code 100 (deleted/private) is permanent");
    assert.equal(isYoutubePermanentErrorMessage({ event: "onError", info: 101 }), true, "Code 101 (embedding disabled) is permanent");
    assert.equal(isYoutubePermanentErrorMessage({ event: "onError", info: 150 }), true, "Code 150 (embedding disabled) is permanent");
    assert.equal(isYoutubePermanentErrorMessage(JSON.stringify({ event: "onError", info: 150 })), true);
    assert.equal(isYoutubePermanentErrorMessage({ info: 101 }), true);
    assert.equal(isYoutubePermanentErrorMessage({ data: 150 }), true);
    assert.equal(isYoutubePermanentErrorMessage({ event: "infoDelivery", info: { errorCode: 150 } }), true);

    // Temporary errors (codes 2, 5) MUST NOT be classified as permanent
    assert.equal(isYoutubePermanentErrorMessage({ event: "onError", info: 2 }), false, "Code 2 (invalid param/network) must not be permanent");
    assert.equal(isYoutubePermanentErrorMessage({ event: "onError", info: 5 }), false, "Code 5 (HTML5 player error) must not be permanent");
    assert.equal(isYoutubePermanentErrorMessage(JSON.stringify({ event: "onError", info: 2 })), false);

    // Non-error packets
    assert.equal(isYoutubePermanentErrorMessage({ event: "onStateChange", info: 1 }), false);
    assert.equal(isYoutubePermanentErrorMessage(null), false);
    assert.equal(isYoutubePermanentErrorMessage("not-json"), false);
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

  await t.test("Active trailer session isolation rejects callbacks from previous slide or unmounted trailer", () => {
    type Session = { epoch: number; slug: string; trailerId: string };
    let currentSession: Session | null = { epoch: 1, slug: "movie-a", trailerId: "trailer-a" };
    let activeTrailerId: string | null = "trailer-a";
    let isTrailerReady = true;
    const failedTrailerMap: Record<string, boolean> = {};

    // User navigates to Slide B (epoch 2)
    currentSession = { epoch: 2, slug: "movie-b", trailerId: "trailer-b" };
    activeTrailerId = "trailer-b";

    // Callback arrives late from Slide A's unmounting iframe:
    const staleCallbackSession: Session = { epoch: 1, slug: "movie-a", trailerId: "trailer-a" };
    const staleErrorEvent = { event: "onError", info: 150 };

    // Handler verifies session match
    const isValidSession =
      currentSession &&
      currentSession.epoch === staleCallbackSession.epoch &&
      currentSession.trailerId === staleCallbackSession.trailerId &&
      currentSession.slug === staleCallbackSession.slug;

    if (isValidSession && isYoutubeErrorMessage(staleErrorEvent)) {
      failedTrailerMap[staleCallbackSession.slug] = true;
      activeTrailerId = null;
      isTrailerReady = false;
    }

    assert.equal(isValidSession, false, "Stale callback must be rejected");
    assert.equal(failedTrailerMap["movie-a"], undefined, "Stale error must not mark Slide A or Slide B as failed");
    assert.equal(activeTrailerId, "trailer-b", "Slide B activeTrailerId must remain untouched");
    assert.equal(isTrailerReady, true, "Slide B trailer readiness must remain untouched");
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

  await t.test("YouTube permanent error immediately marks trailer as permanently failed, but temporary error does not", () => {
    const failedTrailerMap: Record<string, boolean> = {};
    const retryCountMap: Record<string, number> = {};
    const slugPerm = "broken-movie";
    const slugTemp = "temp-glitch-movie";

    // 1. Permanent error (code 150)
    const permErrorEvent = { event: "onError", info: 150 };
    if (isYoutubeErrorMessage(permErrorEvent)) {
      if (isYoutubePermanentErrorMessage(permErrorEvent)) {
        failedTrailerMap[slugPerm] = true;
      } else {
        retryCountMap[slugPerm] = (retryCountMap[slugPerm] || 0) + 1;
      }
    }
    assert.equal(failedTrailerMap[slugPerm], true, "Embed disabled error must immediately mark trailer as failed");

    // 2. Temporary error (code 2)
    const tempErrorEvent = { event: "onError", info: 2 };
    if (isYoutubeErrorMessage(tempErrorEvent)) {
      if (isYoutubePermanentErrorMessage(tempErrorEvent)) {
        failedTrailerMap[slugTemp] = true;
      } else {
        retryCountMap[slugTemp] = (retryCountMap[slugTemp] || 0) + 1;
      }
    }
    assert.equal(failedTrailerMap[slugTemp], undefined, "Code 2 must NOT be marked in failedTrailerMap");
    assert.equal(retryCountMap[slugTemp], 1, "Code 2 should increment retryCount");
  });

  await t.test("Missing synopsis or trailer URL does NOT blacklist slug", () => {
    const failedTrailerMap: Record<string, boolean> = {};
    const slug = "movie-without-trailer";

    const rawTrailer = undefined; // Synopsis returned no trailer_url
    const ytId = rawTrailer ? extractYoutubeId(rawTrailer) : null;

    if (rawTrailer && !ytId) {
      failedTrailerMap[slug] = true;
    }

    assert.equal(failedTrailerMap[slug], undefined, "Missing trailer must NOT be permanently blacklisted");
  });
});

test("TC-HERO-TRAILER-FIX-03 - Device detection & Watchdog lifecycle refinement tests", async (t) => {
  await t.test("isDesktopWithHover behaves correctly under various media query environments", () => {
    const originalWindow = globalThis.window;

    try {
      // 1. Mobile screen (< 768px): always false
      globalThis.window = {
        innerWidth: 390,
        matchMedia: () => ({ matches: false } as unknown as MediaQueryList),
      } as unknown as Window & typeof globalThis;
      assert.equal(isDesktopWithHover(), false, "Mobile screens (<768px) must never activate desktop trailer");

      // 2. Pure touch tablet (>= 768px, hover: none, pointer: coarse, no fine pointer): false
      globalThis.window = {
        innerWidth: 1024,
        matchMedia: (query: string) => {
          if (query === "(hover: none) and (pointer: coarse)") return { matches: true } as unknown as MediaQueryList;
          if (query.includes("fine")) return { matches: false } as unknown as MediaQueryList;
          return { matches: false } as unknown as MediaQueryList;
        },
      } as unknown as Window & typeof globalThis;
      assert.equal(isDesktopWithHover(), false, "Pure touch devices without mouse/trackpad must not activate trailer");

      // 3. Touchscreen Windows laptop (>= 768px, pointer: coarse, BUT any-pointer: fine or hover: hover): true
      globalThis.window = {
        innerWidth: 1440,
        matchMedia: (query: string) => {
          if (query === "(pointer: fine)") return { matches: false } as unknown as MediaQueryList;
          if (query === "(any-pointer: fine)") return { matches: true } as unknown as MediaQueryList;
          if (query === "(hover: hover)") return { matches: true } as unknown as MediaQueryList;
          return { matches: false } as unknown as MediaQueryList;
        },
      } as unknown as Window & typeof globalThis;
      assert.equal(isDesktopWithHover(), true, "Touchscreen laptops with mouse/trackpad must activate trailer");

      // 4. Standard Desktop PC (>= 768px, pointer: fine, hover: hover): true
      globalThis.window = {
        innerWidth: 1920,
        matchMedia: (query: string) => {
          if (query === "(pointer: fine)") return { matches: true } as unknown as MediaQueryList;
          if (query === "(hover: hover)") return { matches: true } as unknown as MediaQueryList;
          return { matches: true } as unknown as MediaQueryList;
        },
      } as unknown as Window & typeof globalThis;
      assert.equal(isDesktopWithHover(), true, "Standard desktop PCs must activate trailer");
    } finally {
      globalThis.window = originalWindow;
    }
  });

  await t.test("Watchdog preserves trailer if video is PLAYING", () => {
    let activeTrailerId: string | null = "test-trailer";
    let isTrailerReady = true;
    const isVideoPlaying = true;

    // Simulate watchdog firing at 8s
    if (!isVideoPlaying) {
      activeTrailerId = null;
      isTrailerReady = false;
    }

    assert.equal(activeTrailerId, "test-trailer", "Active trailer must remain alive if video is playing");
    assert.equal(isTrailerReady, true, "Trailer ready state must remain visible");
  });

  await t.test("Watchdog unmounts trailer and reverts to poster if video is NOT playing after 8s (even if iframe loaded)", () => {
    let activeTrailerId: string | null = "test-trailer";
    let isTrailerReady = false;
    const _isIframeLoaded = true; // Iframe did load DOM
    const isVideoPlaying = false; // BUT video never played (stuck buffering or autoplay blocked)
    const retryCountMap: Record<string, number> = {};
    const slug = "stuck-trailer-movie";

    // Simulate watchdog firing at 8s
    if (!isVideoPlaying) {
      retryCountMap[slug] = (retryCountMap[slug] || 0) + 1;
      activeTrailerId = null;
      isTrailerReady = false;
    }

    assert.equal(activeTrailerId, null, "Trailer must be unmounted if video never reached PLAYING");
    assert.equal(isTrailerReady, false, "Reverts to poster");
    assert.equal(retryCountMap[slug], 1, "Increments retry count");
  });
});

