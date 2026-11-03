import test from "node:test";
import assert from "node:assert/strict";
import {
  markCommentDeleted,
  unmarkCommentDeleted,
  isCommentDeleted,
  deleteMovieComment,
  updateMovieComment,
  addMovieComment,
  addReplyComment,
  subscribeMovieComments,
  subscribeUserComments,
} from "./commentService";
import { MovieComment } from "@/types/comment";

test("Comment CRUD & Synchronization - Anti-Ghost Invariants", async (t) => {
  await t.test("1. markCommentDeleted ensures isCommentDeleted returns true and prevents resurrection", () => {
    const testId = "cmt_test_deleted_123";
    assert.strictEqual(isCommentDeleted(testId), false);
    markCommentDeleted(testId);
    assert.strictEqual(isCommentDeleted(testId), true);
  });

  await t.test("2. deleteMovieComment removes comment from memory cache and marks it deleted immediately", async () => {
    const testCommentId = "cmt_delete_test_456";
    const testMovieSlug = "test-movie-slug";
    
    // Simulate global fetch for DELETE API
    const originalFetch = global.fetch;
    let fetchCalled = false;
    let deleteMethod = "";
    
    // @ts-expect-error Mocking fetch for test
    global.fetch = async (url: string, init?: RequestInit) => {
      fetchCalled = true;
      deleteMethod = init?.method || "";
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };
    };

    try {
      await deleteMovieComment(testCommentId, { movieSlug: testMovieSlug });
      assert.strictEqual(fetchCalled, true);
      assert.strictEqual(deleteMethod, "DELETE");
      assert.strictEqual(isCommentDeleted(testCommentId), true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("3. deleteMovieComment treats 404 (already deleted) as successful idempotent operation", async () => {
    const testCommentId = "cmt_idempotent_404";
    const originalFetch = global.fetch;
    
    // @ts-expect-error Mocking fetch for test
    global.fetch = async () => ({
      ok: false,
      status: 404,
      json: async () => ({ error: "Không tìm thấy bình luận" }),
    });

    try {
      // Should NOT throw because 404 is idempotent success
      await deleteMovieComment(testCommentId);
      assert.strictEqual(isCommentDeleted(testCommentId), true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("4. deleteMovieComment throws on 401/403/429/500 so UI can rollback optimistic state", async () => {
    const testCommentId = "cmt_err_500";
    const originalFetch = global.fetch;
    
    // @ts-expect-error Mocking fetch for test
    global.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: "Lỗi máy chủ nội bộ" }),
    });

    try {
      await assert.rejects(
        async () => {
          await deleteMovieComment(testCommentId);
        },
        {
          name: "Error",
          message: "Lỗi máy chủ nội bộ",
        }
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("5. updateMovieComment throws on server rejection so caller can rollback", async () => {
    const testCommentId = "cmt_update_err";
    const originalFetch = global.fetch;
    
    // @ts-expect-error Mocking fetch for test
    global.fetch = async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: "Nội dung vi phạm tiêu chuẩn cộng đồng!" }),
    });

    try {
      await assert.rejects(
        async () => {
          await updateMovieComment(testCommentId, { content: "Nội dung không hợp lệ" });
        },
        {
          name: "Error",
          message: "Nội dung vi phạm tiêu chuẩn cộng đồng!",
        }
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("6. addMovieComment throws on server error and never returns fake ghost ID", async () => {
    const originalFetch = global.fetch;
    
    // @ts-expect-error Mocking fetch for test
    global.fetch = async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: "Bạn gửi bình luận quá nhanh. Vui lòng chờ 30 giây." }),
    });

    try {
      await assert.rejects(
        async () => {
          await addMovieComment({
            movieSlug: "test-slug",
            userId: "user_test_123",
            userName: "Test User",
            content: "Bình luận thử nghiệm",
            rating: 5,
          });
        },
        {
          name: "Error",
          message: "Bạn gửi bình luận quá nhanh. Vui lòng chờ 30 giây.",
        }
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("7. subscribeMovieComments never includes or resurrects deleted comments", () => {
    const testSlug = "slug-anti-ghost-resurrect";
    const deletedId = "cmt_ghost_resurrect_999";
    markCommentDeleted(deletedId);

    let receivedComments: MovieComment[] = [];
    const unsub = subscribeMovieComments(testSlug, (comments) => {
      receivedComments = comments;
    });

    assert.ok(Array.isArray(receivedComments));
    assert.strictEqual(receivedComments.some((c) => c.id === deletedId), false);
    unsub();
  });

  await t.test("8. subscribeUserComments provides 0ms initial render and filters deleted comments", () => {
    const testUserId = "user_test_999";
    const deletedId = "cmt_user_deleted_888";
    markCommentDeleted(deletedId);

    let receivedComments: MovieComment[] = [];
    const unsub = subscribeUserComments(testUserId, (comments) => {
      receivedComments = comments;
    });

    assert.ok(Array.isArray(receivedComments));
    assert.strictEqual(receivedComments.some((c) => c.id === deletedId), false);
    unsub();
  });

  await t.test("9. unmarkCommentDeleted clears deleted flag and allows item recovery on rollback", () => {
    const testId = "cmt_rollback_test_999";
    markCommentDeleted(testId);
    assert.strictEqual(isCommentDeleted(testId), true);
    unmarkCommentDeleted(testId);
    assert.strictEqual(isCommentDeleted(testId), false);
  });

  await t.test("10. deleteMovieComment restores comment in cache and unmarks deleted on API failure", async () => {
    const testCommentId = "cmt_rollback_on_failure_101";
    const originalFetch = global.fetch;

    // Simulate API rejection (e.g. 500 error)
    // @ts-expect-error Mocking fetch
    global.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: "Database error" }),
    });

    try {
      await assert.rejects(
        async () => {
          await deleteMovieComment(testCommentId);
        },
        {
          name: "Error",
          message: "Database error",
        }
      );
      // Because deletion failed, isCommentDeleted must be un-marked (false)
      assert.strictEqual(isCommentDeleted(testCommentId), false);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await t.test("11. addReplyComment dispatches both reply and comment in event detail for listener compatibility", async () => {
    const originalFetch = global.fetch;
    let dispatchedDetail: Record<string, unknown> | null = null;

    // Simulate browser window environment in Node.js
    const prevWindow = (global as unknown as { window: unknown }).window;
    (global as unknown as { window: { dispatchEvent: (event: Event) => boolean } }).window = {
      dispatchEvent: (event: Event) => {
        if (event.type === "comments-updated" && "detail" in event) {
          dispatchedDetail = (event as CustomEvent).detail;
        }
        return true;
      },
    };

    // @ts-expect-error Mocking fetch
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: "reply_generated_123" }),
    });

    try {
      await addReplyComment({
        parentId: "parent_root_1",
        parentOwnerId: "user_parent_owner",
        movieSlug: "test-movie",
        userId: "user_reply_1",
        userName: "Replier",
        content: "Phản hồi thử nghiệm",
      });

      assert.ok(dispatchedDetail !== null);
      assert.strictEqual((dispatchedDetail as Record<string, unknown>).parentId, "parent_root_1");
      assert.ok((dispatchedDetail as Record<string, unknown>).reply !== undefined);
      assert.ok((dispatchedDetail as Record<string, unknown>).comment !== undefined);
      assert.strictEqual(
        ((dispatchedDetail as Record<string, unknown>).reply as MovieComment).id,
        "reply_generated_123"
      );
      assert.strictEqual(
        ((dispatchedDetail as Record<string, unknown>).comment as MovieComment).id,
        "reply_generated_123"
      );
    } finally {
      global.fetch = originalFetch;
      (global as unknown as { window: unknown }).window = prevWindow;
    }
  });
});

