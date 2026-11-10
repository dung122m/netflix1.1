import test from "node:test";
import assert from "node:assert/strict";

interface WatchHistoryItem {
  slug: string;
  title: string;
  episodeSlug?: string;
  progressSeconds?: number;
  durationSeconds?: number;
}

function isContinueWatchingItem(item: WatchHistoryItem): boolean {
  if (item.durationSeconds && item.durationSeconds > 0 && typeof item.progressSeconds === "number") {
    const percent = (item.progressSeconds / item.durationSeconds) * 100;
    return percent < 95;
  }
  return true;
}

test("isContinueWatchingItem filters completed and near-completed items correctly", () => {
  // Case 1: Video at 50% (300s / 600s) -> Should appear
  assert.equal(
    isContinueWatchingItem({ slug: "movie-1", title: "Movie 1", progressSeconds: 300, durationSeconds: 600 }),
    true
  );

  // Case 2: Video at 94% (564s / 600s) -> Should appear
  assert.equal(
    isContinueWatchingItem({ slug: "movie-2", title: "Movie 2", progressSeconds: 564, durationSeconds: 600 }),
    true
  );

  // Case 3: Video at 95% (570s / 600s) -> Should NOT appear
  assert.equal(
    isContinueWatchingItem({ slug: "movie-3", title: "Movie 3", progressSeconds: 570, durationSeconds: 600 }),
    false
  );

  // Case 4: Video at 99% (594s / 600s) -> Should NOT appear
  assert.equal(
    isContinueWatchingItem({ slug: "movie-4", title: "Movie 4", progressSeconds: 594, durationSeconds: 600 }),
    false
  );

  // Case 5: Video at 100% (600s / 600s) -> Should NOT appear
  assert.equal(
    isContinueWatchingItem({ slug: "movie-5", title: "Movie 5", progressSeconds: 600, durationSeconds: 600 }),
    false
  );

  // Case 6: Unknown duration -> Should appear
  assert.equal(
    isContinueWatchingItem({ slug: "movie-6", title: "Movie 6", progressSeconds: 120, durationSeconds: 0 }),
    true
  );
});

test("Episode progress isolation: completing episode 2 does not clear episode 1", () => {
  const episodeProgressMap: Record<string, Record<string, { progress: number; duration: number }>> = {};

  // Watch episode 1 (40% progress)
  episodeProgressMap["series-a"] = {
    "tap-1": { progress: 400, duration: 1000 },
  };

  // Watch episode 2 to completion (100% progress)
  episodeProgressMap["series-a"]["tap-2"] = { progress: 1000, duration: 1000 };

  // Check tap-1 is still at 40% (400s)
  assert.equal(episodeProgressMap["series-a"]["tap-1"].progress, 400);
  assert.equal(
    isContinueWatchingItem({
      slug: "series-a",
      title: "Series A",
      episodeSlug: "tap-1",
      progressSeconds: episodeProgressMap["series-a"]["tap-1"].progress,
      durationSeconds: episodeProgressMap["series-a"]["tap-1"].duration,
    }),
    true
  );

  // Check tap-2 is 100% and filtered from continue watching
  assert.equal(episodeProgressMap["series-a"]["tap-2"].progress, 1000);
  assert.equal(
    isContinueWatchingItem({
      slug: "series-a",
      title: "Series A",
      episodeSlug: "tap-2",
      progressSeconds: episodeProgressMap["series-a"]["tap-2"].progress,
      durationSeconds: episodeProgressMap["series-a"]["tap-2"].duration,
    }),
    false
  );
});
