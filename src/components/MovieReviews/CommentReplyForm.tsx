"use client";

import React from "react";
import { Loader2, Send } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";

export interface CommentReplyFormProps {
  commentUserName: string;
  currentUserId?: string | null;
  currentUserName?: string;
  currentUserAvatar?: string;
  replyContent: string;
  onReplyContentChange: (value: string) => void;
  replyTargetUser: { userId: string; userName: string } | null;
  isSubmittingReply: boolean;
  replyInputRef: React.RefObject<HTMLTextAreaElement | null>;
  onClearTarget: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function CommentReplyForm({
  commentUserName,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  replyContent,
  onReplyContentChange,
  replyTargetUser,
  isSubmittingReply,
  replyInputRef,
  onClearTarget,
  onCancel,
  onSubmit,
}: CommentReplyFormProps) {
  return (
    <div className="mt-3 p-2.5 sm:p-3.5 bg-zinc-950/80 rounded-xl sm:rounded-2xl animate-in fade-in zoom-in-98 duration-150">
      {replyTargetUser && (
        <div className="flex items-center justify-between mb-2 px-1 text-xs text-netflix-red font-medium">
          <span className="flex items-center gap-1 truncate">
            <span>Đang trả lời</span>
            <strong className="text-netflix-red">
              @{replyTargetUser.userName}
            </strong>
          </span>
          <button
            type="button"
            onClick={onClearTarget}
            className="text-[11px] text-zinc-400 hover:text-white cursor-pointer hover:underline flex-shrink-0 ml-2"
          >
            Hủy chỉ định
          </button>
        </div>
      )}

      <div className="flex gap-2 sm:gap-2.5 items-start">
        <UserAvatar
          src={currentUserAvatar || undefined}
          name={currentUserName}
          seed={currentUserId || currentUserName}
          sizeClassName="w-6 h-6 sm:w-7 sm:h-7 text-[10px] sm:text-xs"
          className="mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <textarea
            ref={replyInputRef}
            value={replyContent}
            onChange={(e) => onReplyContentChange(e.target.value)}
            placeholder={
              replyTargetUser
                ? `Trả lời @${replyTargetUser.userName}...`
                : `Trả lời ${commentUserName}...`
            }
            rows={2}
            maxLength={500}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                onSubmit();
              }
            }}
            className="w-full bg-black/80 rounded-xl px-3 py-2 text-base sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-netflix-red/60 focus:ring-1 focus:ring-netflix-red/30 resize-none transition-all"
          />
          <div className="flex items-center justify-between mt-1.5 gap-2 flex-wrap">
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {replyContent.length}/500 ·{" "}
              <span className="hidden sm:inline">Ctrl+Enter để gửi</span>
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmittingReply || !replyContent.trim()}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-netflix-red hover:brightness-110 active:brightness-95 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer shadow-md shadow-black/40"
              >
                {isSubmittingReply ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Gửi</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

