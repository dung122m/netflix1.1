import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { syncUserProfileAcrossContent } from "@/lib/userProfileSync";
import { cacheService } from "@/lib/cache";

describe("syncUserProfileAcrossContent", () => {
  it("updates movie_comments, notifications, collections and invalidates movie comment Redis cache", async () => {
    const updatedCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];
    const deletedCacheKeys: string[] = [];

    const originalDelete = cacheService.delete.bind(cacheService);
    cacheService.delete = async (key: string) => {
      deletedCacheKeys.push(key);
      return true;
    };

    const mockChain = (table: string, rows: Array<Record<string, unknown>> = []) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        limit: async () => ({ data: rows, error: null }),
        update: (payload: Record<string, unknown>) => {
          updatedCalls.push({ table, payload });
          return chain;
        },
        then: (resolve: (val: { data: Array<Record<string, unknown>>; error: null }) => void) =>
          resolve({ data: rows, error: null }),
      };
      return chain;
    };

    const fakeSupabase = {
      from: (table: string) => {
        if (table === "movie_comments") {
          return mockChain(table, [
            { id: "cmt_1", movie_slug: "phim-alpha" },
            { id: "cmt_2", movie_slug: "phim-beta" },
            { id: "cmt_3", movie_slug: "phim-alpha" },
          ]);
        }
        if (table === "comment_reactions") {
          return mockChain(table, [{ comment_id: "cmt_parent_9" }]);
        }
        return mockChain(table, []);
      },
    };

    try {
      await syncUserProfileAcrossContent({
        // @ts-expect-error mock supabase client
        supabase: fakeSupabase,
        userId: "user_123",
        nextAvatar: "https://cdn.example.com/new.webp",
        prevAvatar: "https://cdn.example.com/old.webp",
        nextDisplayName: "Tên Mới",
        prevDisplayName: "Tên Cũ",
      });

      assert.ok(
        updatedCalls.some(
          (c) =>
            c.table === "movie_comments" &&
            c.payload.user_avatar === "https://cdn.example.com/new.webp" &&
            c.payload.user_name === "Tên Mới",
        ),
        "Should update movie_comments with new avatar and displayName",
      );

      assert.ok(
        updatedCalls.some(
          (c) =>
            c.table === "notifications" &&
            c.payload.replier_avatar === "https://cdn.example.com/new.webp" &&
            c.payload.replier_name === "Tên Mới",
        ),
        "Should update notifications with new replier_avatar and replier_name",
      );

      assert.ok(
        updatedCalls.some(
          (c) =>
            c.table === "collections" &&
            c.payload.user_avatar === "https://cdn.example.com/new.webp" &&
            c.payload.user_name === "Tên Mới",
        ),
        "Should update collections with new user_avatar and user_name",
      );

      assert.deepEqual(
        deletedCacheKeys.sort(),
        ["comments:movie:phim-alpha", "comments:movie:phim-beta"],
        "Should invalidate deduplicated Redis comment caches for all commented movies",
      );
    } finally {
      cacheService.delete = originalDelete;
    }
  });
});
