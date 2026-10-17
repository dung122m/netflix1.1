import test from "node:test";
import assert from "node:assert/strict";
import { classifyRoute } from "./SiteVisitTracker";
import {
  trackSiteVisit,
  trackMovieView,
  trackWatchStart,
  trackWatchProgress,
  trackWatchEnd,
  trackSearchKeyword,
  isValidAnonymousId,
} from "@/lib/analyticsClient";

test("TRACKER TEST 1 — ROUTE CLASSIFICATION: Valid routes mapped to proper page groups", () => {
  // 1. Home
  const home = classifyRoute("/");
  assert.equal(home.pageGroup, "home");
  assert.equal(home.pagePath, "/");
  assert.equal(home.shouldTrack, true);

  // 2. Movies
  const movie = classifyRoute("/movies/squid-game-2");
  assert.equal(movie.pageGroup, "movie");
  assert.equal(movie.pagePath, "/movies/squid-game-2");
  assert.equal(movie.shouldTrack, true);

  // 3. Browse / Categories / Collections
  const browse = classifyRoute("/browse");
  assert.equal(browse.pageGroup, "browse");
  assert.equal(browse.shouldTrack, true);

  const collection = classifyRoute("/collection/marvel-cinematic");
  assert.equal(collection.pageGroup, "browse");
  assert.equal(collection.shouldTrack, true);

  const actor = classifyRoute("/dien-vien/lee-jung-jae");
  assert.equal(actor.pageGroup, "browse");
  assert.equal(actor.shouldTrack, true);

  // 4. Live Sports & Live TV
  const live = classifyRoute("/live");
  assert.equal(live.pageGroup, "live");
  assert.equal(live.shouldTrack, true);

  const liveTv = classifyRoute("/live-tv");
  assert.equal(liveTv.pageGroup, "live-tv");
  assert.equal(liveTv.shouldTrack, true);

  // 5. Search
  const search = classifyRoute("/search");
  assert.equal(search.pageGroup, "search");
  assert.equal(search.shouldTrack, true);

  // 6. Informational pages
  const about = classifyRoute("/about");
  assert.equal(about.pageGroup, "browse");
  assert.equal(about.shouldTrack, true);
});

test("TRACKER TEST 2 — EXCLUDED ROUTES: Admin, API, Next.js internals, and static assets ignored", () => {
  // Admin routes must never trigger tracking
  assert.equal(classifyRoute("/admin").shouldTrack, false);
  assert.equal(classifyRoute("/admin/analytics").shouldTrack, false);
  assert.equal(classifyRoute("/admin/dashboard").shouldTrack, false);

  // API routes must never trigger tracking
  assert.equal(classifyRoute("/api/analytics/track").shouldTrack, false);
  assert.equal(classifyRoute("/api/movies").shouldTrack, false);

  // Next.js internal paths & static files
  assert.equal(classifyRoute("/_next/static/chunks/main.js").shouldTrack, false);
  assert.equal(classifyRoute("/favicon.ico").shouldTrack, false);
  assert.equal(classifyRoute("/icon.svg").shouldTrack, false);
  assert.equal(classifyRoute("/manifest.json").shouldTrack, false);

  // Null/empty path
  assert.equal(classifyRoute("").shouldTrack, false);
  assert.equal(classifyRoute(null).shouldTrack, false);
});

test("TRACKER TEST 3 — TRAILING SLASH NORMALIZATION: Clean paths matched uniformly", () => {
  const withSlash = classifyRoute("/browse/");
  assert.equal(withSlash.pageGroup, "browse");
  assert.equal(withSlash.pagePath, "/browse");
  assert.equal(withSlash.shouldTrack, true);

  const movieWithSlash = classifyRoute("/movies/arcane/");
  assert.equal(movieWithSlash.pageGroup, "movie");
  assert.equal(movieWithSlash.pagePath, "/movies/arcane");
  assert.equal(movieWithSlash.shouldTrack, true);
});

test("TRACKER TEST 4 — ANONYMOUS ID FORMAT: Stability and validity checks", () => {
  assert.equal(isValidAnonymousId("anon_12345678"), true);
  assert.equal(isValidAnonymousId("anon_abcdef1234567890"), true);
  assert.equal(isValidAnonymousId("user_123456"), false);
  assert.equal(isValidAnonymousId("invalid-id"), false);
  assert.equal(isValidAnonymousId(null), false);
  assert.equal(isValidAnonymousId(undefined), false);
});

test("TRACKER TEST 5 — NO-OP VERIFICATION: Non-visit trackers remain completely no-op", () => {
  // Ensure none of the discontinued trackers throw or send requests
  assert.doesNotThrow(() => {
    trackMovieView({ movieSlug: "arcane" });
    trackWatchStart({ movieSlug: "arcane" });
    trackWatchProgress({ movieSlug: "arcane", progressSeconds: 50 });
    trackWatchEnd({ movieSlug: "arcane", progressSeconds: 100 });
    trackSearchKeyword("anime");
  });
});

test("TRACKER TEST 6 — FAIL-SAFE EXECUTION: trackSiteVisit handles serverless/node environments safely", async () => {
  // Running in Node environment (window === undefined): should gracefully no-op without error
  await assert.doesNotReject(async () => {
    await trackSiteVisit({ pageGroup: "home", pagePath: "/" });
    await trackSiteVisit();
  });
});
