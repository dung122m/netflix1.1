/**
 * Comment Tombstone & Ghost Prevention Manager
 * - Ngăn chặn tình trạng bình luận đã bị xóa xuất hiện lại (Ghost Comments)
 * - Quản lý Set in-memory + sessionStorage client
 */

const deletedCommentIds = new Set<string>();

export function markCommentDeleted(commentId: string): void {
  if (!commentId) return;
  deletedCommentIds.add(commentId);
  try {
    if (typeof sessionStorage !== "undefined") {
      const stored = JSON.parse(sessionStorage.getItem("nanaflix_deleted_comments") || "[]");
      if (Array.isArray(stored) && !stored.includes(commentId)) {
        stored.push(commentId);
        sessionStorage.setItem("nanaflix_deleted_comments", JSON.stringify(stored.slice(-200)));
      }
    }
  } catch {}
}

export function unmarkCommentDeleted(commentId: string): void {
  if (!commentId) return;
  deletedCommentIds.delete(commentId);
  try {
    if (typeof sessionStorage !== "undefined") {
      const stored = JSON.parse(sessionStorage.getItem("nanaflix_deleted_comments") || "[]");
      if (Array.isArray(stored)) {
        sessionStorage.setItem(
          "nanaflix_deleted_comments",
          JSON.stringify(stored.filter((id: string) => id !== commentId))
        );
      }
    }
  } catch {}
}

export function isCommentDeleted(commentId: string): boolean {
  if (!commentId) return false;
  if (deletedCommentIds.has(commentId)) return true;
  try {
    if (typeof sessionStorage !== "undefined") {
      const stored = JSON.parse(sessionStorage.getItem("nanaflix_deleted_comments") || "[]");
      if (Array.isArray(stored) && stored.includes(commentId)) {
        deletedCommentIds.add(commentId);
        return true;
      }
    }
  } catch {}
  return false;
}

