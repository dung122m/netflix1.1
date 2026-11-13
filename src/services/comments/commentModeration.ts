/**
 * Comment Moderation & Auto-Clean Engine
 * - Quét và dọn dẹp các bình luận vi phạm tiêu chuẩn cộng đồng, spam, tục tĩu
 * - Xóa hàng loạt các bình luận bị gắn cờ
 */

import { MovieComment } from "@/types/comment";
import { checkContentModeration } from "@/lib/contentModeration";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getAllCommentsSupabase } from "@/services/supabaseService";

export interface AutoCleanResult {
  scannedCount: number;
  deletedCount: number;
  deletedItems: Array<{
    id: string;
    userName: string;
    movieSlug: string;
    content: string;
    reason: string;
    violations: string[];
  }>;
}

/**
 * HỆ THỐNG TỰ ĐỘNG QUÉT & XÓA BÌNH LUẬN VÔ VĂN HÓA, TỤC TĨU, SPAM
 */
export async function autoCleanAllToxicAndSpamComments(
  allComments?: MovieComment[],
  deleteFn?: (commentId: string) => Promise<void>
): Promise<AutoCleanResult> {
  let itemsToScan = allComments;
  if (!itemsToScan || itemsToScan.length === 0) {
    if (isSupabaseConfigured()) {
      try {
        itemsToScan = await getAllCommentsSupabase();
      } catch {
        itemsToScan = [];
      }
    }
  }

  const items = itemsToScan || [];
  const deletedItems: AutoCleanResult["deletedItems"] = [];

  for (const c of items) {
    const mod = checkContentModeration(c.content || "");
    const isToxicOrSpam = !mod.isAllowed || c.isFlagged;

    if (isToxicOrSpam) {
      try {
        if (deleteFn) {
          await deleteFn(c.id);
        }
        deletedItems.push({
          id: c.id,
          userName: c.userName,
          movieSlug: c.movieSlug,
          content: c.content,
          reason: mod.reason || c.flagReason || "Tự động xóa do vi phạm tiêu chuẩn cộng đồng",
          violations: mod.violations,
        });
      } catch (err) {
        console.warn("Lỗi xóa tự động comment rác:", c.id, err);
      }
    }
  }

  return {
    scannedCount: items.length,
    deletedCount: deletedItems.length,
    deletedItems,
  };
}

/**
 * Xóa nhanh tất cả bình luận đang bị gắn cờ vi phạm trong 1 thao tác
 */
export async function purgeAllFlaggedComments(
  commentsList: MovieComment[],
  deleteFn?: (commentId: string) => Promise<void>
): Promise<number> {
  if (!commentsList) return 0;
  const flagged = commentsList.filter((c) => c.isFlagged);
  let deletedCount = 0;
  for (const c of flagged) {
    try {
      if (deleteFn) {
        await deleteFn(c.id);
      }
      deletedCount++;
    } catch (e) {
      console.warn("Lỗi xóa cmt gắn cờ:", c.id, e);
    }
  }
  return deletedCount;
}

