import test from "node:test";
import assert from "node:assert/strict";

test("Community Watch & Guest Identity Verification", async () => {
  // Mock data representing watch_history rows
  interface WatchHistoryMockRow {
    id: string;
    user_id: string;
    slug: string;
    title: string;
    updated_at: number;
  }

  const rows: WatchHistoryMockRow[] = [];

  function simulateRecordView(movie: { slug: string; title: string; userId?: string; anonymousId?: string; timestamp: number }) {
    const identity = movie.userId || movie.anonymousId || "guest";
    const id = `${identity}_${movie.slug}`;

    const existingIndex = rows.findIndex((r) => r.id === id);
    if (existingIndex >= 0) {
      // Upsert: update timestamp
      rows[existingIndex].updated_at = movie.timestamp;
    } else {
      // Insert new unique record
      rows.push({
        id,
        user_id: identity,
        slug: movie.slug,
        title: movie.title,
        updated_at: movie.timestamp,
      });
    }
  }

  const now = Date.now();

  // 1. Guest A watches Movie A
  simulateRecordView({ slug: "movie-a", title: "Movie A", anonymousId: "anon_guestA_12345", timestamp: now });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "anon_guestA_12345_movie-a");

  // 2. Guest A reloads/watches Movie A again -> same unique record (no duplicate row)
  simulateRecordView({ slug: "movie-a", title: "Movie A", anonymousId: "anon_guestA_12345", timestamp: now + 5000 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].updated_at, now + 5000);

  // 3. Guest B watches Movie A -> separate unique record (+1)
  simulateRecordView({ slug: "movie-a", title: "Movie A", anonymousId: "anon_guestB_67890", timestamp: now + 10000 });
  assert.equal(rows.length, 2);

  // 4. Authenticated User watches Movie A -> separate unique record (+1)
  simulateRecordView({ slug: "movie-a", title: "Movie A", userId: "user_registered_999", timestamp: now + 15000 });
  assert.equal(rows.length, 3);

  // Count total views for movie-a
  const movieAViews = rows.filter((r) => r.slug === "movie-a").length;
  assert.equal(movieAViews, 3, "Movie A should have 3 distinct viewers (Guest A, Guest B, User)");
});
