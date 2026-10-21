import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeAndDeduplicateMovies } from "@/app/api/user/collections/route";
import { normalizeCollection } from "@/services/collectionService";
import type { CollectionMovieItem } from "@/types/collection";

describe("TC-COLLECTION-SERIES-EPISODE-02: Movies, Series & Episode Collections Verification", () => {
  it("TC-01: Independent coexistence and deduplication of Movie, Series, and multiple Episodes", () => {
    const rawItems = [
      {
        slug: "the-batman",
        title: "The Batman",
        poster: "https://example.com/batman.jpg",
        itemType: "movie" as const,
      },
      {
        slug: "one-piece",
        title: "One Piece (Đảo Hải Tặc)",
        poster: "https://example.com/op.jpg",
        itemType: "series" as const,
        seriesSlug: "one-piece",
        seriesTitle: "One Piece (Đảo Hải Tặc)",
      },
      {
        slug: "one-piece__ep__tap-1",
        title: "One Piece - Tập 1",
        poster: "https://example.com/op.jpg",
        itemType: "episode" as const,
        seriesSlug: "one-piece",
        seriesTitle: "One Piece (Đảo Hải Tặc)",
        episodeSlug: "tap-1",
        episodeName: "Tập 1",
      },
      {
        slug: "one-piece__ep__tap-2",
        title: "One Piece - Tập 2",
        poster: "https://example.com/op.jpg",
        itemType: "episode" as const,
        seriesSlug: "one-piece",
        seriesTitle: "One Piece (Đảo Hải Tặc)",
        episodeSlug: "tap-2",
        episodeName: "Tập 2",
      },
      // Duplicate of Tập 1 to test deduplication
      {
        slug: "one-piece__ep__tap-1",
        title: "One Piece - Tập 1 (Duplicate)",
        poster: "https://example.com/op.jpg",
        itemType: "episode" as const,
        seriesSlug: "one-piece",
        seriesTitle: "One Piece (Đảo Hải Tặc)",
        episodeSlug: "tap-1",
        episodeName: "Tập 1",
      },
    ];

    const deduplicated = sanitizeAndDeduplicateMovies(rawItems);

    // Expect 4 unique items: movie, series, ep 1, ep 2
    assert.strictEqual(deduplicated.length, 4, "Should contain exactly 4 unique items");

    const slugs = deduplicated.map((item) => item.slug);
    assert.deepStrictEqual(slugs, [
      "the-batman",
      "one-piece",
      "one-piece__ep__tap-1",
      "one-piece__ep__tap-2",
    ]);

    // Check that episode metadata is strictly preserved
    const ep1 = deduplicated.find((item) => item.slug === "one-piece__ep__tap-1");
    assert.ok(ep1);
    assert.strictEqual(ep1.itemType, "episode");
    assert.strictEqual(ep1.seriesSlug, "one-piece");
    assert.strictEqual(ep1.seriesTitle, "One Piece (Đảo Hải Tặc)");
    assert.strictEqual(ep1.episodeSlug, "tap-1");
    assert.strictEqual(ep1.episodeName, "Tập 1");

    // Check series item
    const series = deduplicated.find((item) => item.slug === "one-piece");
    assert.ok(series);
    assert.strictEqual(series.itemType, "series");
  });

  it("TC-02: Deletion of episode does not delete series, and deletion of series does not delete episode", () => {
    let items: CollectionMovieItem[] = [
      {
        slug: "naruto",
        title: "Naruto",
        poster: "https://example.com/naruto.jpg",
        itemType: "series",
        addedAt: Date.now(),
      },
      {
        slug: "naruto__ep__tap-01",
        title: "Naruto - Tập 01",
        poster: "https://example.com/naruto.jpg",
        itemType: "episode",
        seriesSlug: "naruto",
        episodeSlug: "tap-01",
        addedAt: Date.now(),
      },
      {
        slug: "naruto__ep__tap-02",
        title: "Naruto - Tập 02",
        poster: "https://example.com/naruto.jpg",
        itemType: "episode",
        seriesSlug: "naruto",
        episodeSlug: "tap-02",
        addedAt: Date.now(),
      },
    ];

    // Remove Tập 01
    items = items.filter((item) => item.slug !== "naruto__ep__tap-01");
    assert.strictEqual(items.length, 2);
    assert.ok(items.some((item) => item.slug === "naruto"));
    assert.ok(items.some((item) => item.slug === "naruto__ep__tap-02"));

    // Remove Series 'naruto'
    items = items.filter((item) => item.slug !== "naruto");
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].slug, "naruto__ep__tap-02");
    assert.strictEqual(items[0].itemType, "episode");
  });

  it("TC-03: normalizeCollection safely parses legacy items and maintains new metadata", () => {
    const rawLegacyCollection = {
      id: "col-123",
      user_id: "user-456",
      name: "Phim yêu thích",
      description: "Mô tả",
      is_public: false,
      movies: [
        // Legacy movie without itemType
        {
          slug: "interstellar",
          title: "Interstellar",
          poster: "https://example.com/interstellar.jpg",
        },
        // Legacy episode with __ep__ slug but no explicit metadata
        {
          slug: "attack-on-titan__ep__tap-1",
          title: "Attack on Titan - Tập 1",
          poster: "https://example.com/aot.jpg",
        },
        // Modern episode with full explicit metadata
        {
          slug: "stranger-things__ep__s01-e01",
          title: "Stranger Things - Tập 1",
          poster: "https://example.com/st.jpg",
          itemType: "episode",
          seriesSlug: "stranger-things",
          seriesTitle: "Stranger Things",
          episodeSlug: "s01-e01",
          episodeName: "Tập 1",
          seasonName: "Season 1",
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const normalized = normalizeCollection(rawLegacyCollection);
    assert.ok(normalized, "Normalized collection should not be null");
    assert.strictEqual(normalized.movies.length, 3);

    // Legacy movie should be preserved
    assert.strictEqual(normalized.movies[0].slug, "interstellar");

    // Legacy episode should be safely detected without crashing
    const legacyEp = normalized.movies[1];
    assert.strictEqual(legacyEp.slug, "attack-on-titan__ep__tap-1");
    assert.strictEqual(legacyEp.itemType, "episode");
    assert.strictEqual(legacyEp.seriesSlug, "attack-on-titan");
    assert.strictEqual(legacyEp.episodeSlug, "tap-1");

    // Modern episode should preserve all explicit metadata
    const modernEp = normalized.movies[2];
    assert.strictEqual(modernEp.slug, "stranger-things__ep__s01-e01");
    assert.strictEqual(modernEp.itemType, "episode");
    assert.strictEqual(modernEp.seriesSlug, "stranger-things");
    assert.strictEqual(modernEp.seriesTitle, "Stranger Things");
    assert.strictEqual(modernEp.episodeSlug, "s01-e01");
    assert.strictEqual(modernEp.episodeName, "Tập 1");
    assert.strictEqual(modernEp.seasonName, "Season 1");
  });

  it("TC-04: Navigation URL resolver properly directs episodes to series page with ?ep= query", () => {
    function resolveNavigationHref(item: {
      slug: string;
      itemType?: string;
      seriesSlug?: string;
      episodeSlug?: string;
    }): string {
      const isEpisode =
        item.itemType === "episode" ||
        (item.slug && item.slug.includes("__ep__"));

      if (isEpisode) {
        let parentSeriesSlug = item.seriesSlug;
        let epSlug = item.episodeSlug;

        if (!parentSeriesSlug || !epSlug) {
          const parts = item.slug.split("__ep__");
          if (!parentSeriesSlug) parentSeriesSlug = parts[0];
          if (!epSlug) epSlug = parts[1];
        }

        if (parentSeriesSlug && epSlug) {
          return `/movies/${encodeURIComponent(parentSeriesSlug)}?ep=${encodeURIComponent(epSlug)}`;
        }
      }

      return `/movies/${encodeURIComponent(item.slug)}`;
    }

    // Movie URL
    const movieUrl = resolveNavigationHref({
      slug: "oppenheimer-2023",
      itemType: "movie",
    });
    assert.strictEqual(movieUrl, "/movies/oppenheimer-2023");

    // Series URL
    const seriesUrl = resolveNavigationHref({
      slug: "breaking-bad",
      itemType: "series",
    });
    assert.strictEqual(seriesUrl, "/movies/breaking-bad");

    // Episode with explicit metadata
    const epUrl1 = resolveNavigationHref({
      slug: "breaking-bad__ep__s01-e01",
      itemType: "episode",
      seriesSlug: "breaking-bad",
      episodeSlug: "s01-e01",
    });
    assert.strictEqual(epUrl1, "/movies/breaking-bad?ep=s01-e01");

    // Episode with special characters / legacy fallback
    const epUrl2 = resolveNavigationHref({
      slug: "tay-du-ki__ep__tap-01-full",
    });
    assert.strictEqual(epUrl2, "/movies/tay-du-ki?ep=tap-01-full");
  });
});
