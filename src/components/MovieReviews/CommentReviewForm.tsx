"use client";

import React from "react";
import {
  Send,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Film,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { StarRating } from "./StarRating";
import { MovieComment } from "@/types/comment";
import { detectSpoiler } from "@/lib/contentModeration";

const QUICK_TAGS = [
  "Siêu phẩm đáng xem",
  "Xúc động",
  "Giải trí cuối tuần",
  "Hài hước",
  "Diễn xuất 10/10",
  "Plot twist bất ngờ",
];

interface CommentReviewFormProps {
  formRef: React.RefObject<HTMLFormElement | null>;
  rating: number;
  setRating: (r: number) => void;
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  isSpoiler: boolean;
  setIsSpoiler: (s: boolean) => void;
  scopeEpisode: "all" | "episode";
  setScopeEpisode: (s: "all" | "episode") => void;
  currentEpisodeName?: string;
  isSubmitting: boolean;
  myExistingReview: MovieComment | null;
  effectiveAvatar?: string;
  effectiveDisplayName: string;
  onSubmit: (e: React.FormEvent) => void;
  onDeleteReview: (id: string) => void;
}

export const CommentReviewForm: React.FC<CommentReviewFormProps> = ({
  formRef,
  rating,
  setRating,
  content,
  setContent,
  isSpoiler,
  setIsSpoiler,
  scopeEpisode,
  setScopeEpisode,
  currentEpisodeName,
  isSubmitting,
  myExistingReview,
  effectiveAvatar,
  effectiveDisplayName,
  onSubmit,
  onDeleteReview,
}) => {
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="bg-zinc-900/50 rounded-2xl p-4 md:p-6 transition-all"
    >
      {/* Existing Review Notice Banner */}
      {myExistingReview && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-500/10 rounded-xl px-4 py-2.5 mb-4 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {myExistingReview.rating && myExistingReview.rating > 0
                ? `Bạn đã đánh giá bộ phim này (${myExistingReview.rating} sao). Bạn có thể chỉnh sửa nhận xét bên dưới và bấm Cập nhật.`
                : `Bạn đã để lại bình luận cho bộ phim này. Bạn có thể chỉnh sửa nhận xét bên dưới và bấm Cập nhật.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onDeleteReview(myExistingReview.id)}
            className="text-zinc-400 hover:text-red-400 transition underline underline-offset-2 shrink-0 cursor-pointer self-end sm:self-auto"
          >
            Xóa đánh giá
          </button>
        </div>
      )}

      {/* User Header & Star Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <UserAvatar
            src={effectiveAvatar || undefined}
            name={effectiveDisplayName}
            sizeClassName="w-8 h-8 text-xs font-bold"
          />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-zinc-200 block leading-tight truncate">
              {effectiveDisplayName}
            </span>
            <span className="text-[11px] text-zinc-500">
              {myExistingReview ? "Chỉnh sửa đánh giá của bạn" : "Đánh giá & chia sẻ cảm nhận"}
            </span>
          </div>
        </div>

        {/* Star Rating Interactive */}
        <div className="bg-black/40 px-3.5 py-1.5 rounded-xl inline-flex items-center self-start sm:self-auto">
          <StarRating
            value={rating}
            onChange={setRating}
            size="md"
            showLabel
          />
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => {
            const val = e.target.value;
            setContent(val);
            if (!isSpoiler && detectSpoiler(val)) {
              setIsSpoiler(true);
            }
          }}
          placeholder={
            scopeEpisode === "episode" && currentEpisodeName
              ? `Viết cảm nhận của bạn về ${currentEpisodeName}...`
              : "Viết cảm nhận của bạn về bộ phim..."
          }
          rows={3}
          className="w-full min-h-[96px] bg-black/60 rounded-xl px-4 py-3 text-base sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-netflix-red focus:ring-1 focus:ring-netflix-red/30 resize-none transition-all"
          maxLength={1000}
        />
        <div className="text-[11px] text-zinc-500 text-right mt-1 font-sans tabular-nums">
          {content.length}/1000 ký tự
        </div>
      </div>

      {/* Quick Tag chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap sm:flex-wrap pt-1 pb-1 -mx-1 px-1">
        <span className="text-[11px] text-zinc-500 mr-1 shrink-0 whitespace-nowrap">
          Gợi ý nhanh:
        </span>
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() =>
              setContent((prev) =>
                prev ? `${prev} ${tag}` : tag,
              )
            }
            className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition cursor-pointer shrink-0 whitespace-nowrap"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Options Row: Episode scope, Spoil toggle, Submit button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-white/[0.08]">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap w-full sm:w-auto">
          {/* Episode scope toggle */}
          {currentEpisodeName && (
            <div className="inline-flex items-center p-0.5 rounded-xl bg-black/40 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setScopeEpisode("all")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${scopeEpisode === "all"
                  ? "bg-zinc-800 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
                  }`}
              >
                Cả bộ phim
              </button>
              <button
                type="button"
                onClick={() => setScopeEpisode("episode")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 cursor-pointer ${scopeEpisode === "episode"
                  ? "bg-netflix-red text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
                  }`}
              >
                <Film className="w-3 h-3" />
                <span>{currentEpisodeName}</span>
              </button>
            </div>
          )}

          {/* Spoiler badge button */}
          <button
            type="button"
            onClick={() => setIsSpoiler(!isSpoiler)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer select-none active:scale-95 ${isSpoiler
              ? "bg-amber-500/20 text-amber-300 ring-1 ring-inset ring-amber-500/40"
              : "bg-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08]"
              }`}
            aria-pressed={isSpoiler}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${isSpoiler ? "text-amber-400" : "text-zinc-500"}`} />
            <span>{isSpoiler ? "Có Spoil nội dung" : "Bình luận có Spoil?"}</span>
          </button>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 w-full sm:w-auto shrink-0 cursor-pointer ${myExistingReview
            ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-black/40"
            : "bg-netflix-red hover:brightness-110 shadow-black/50"
            }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{myExistingReview ? "Đang lưu..." : "Đang gửi..."}</span>
            </>
          ) : myExistingReview ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Cập nhật Đánh Giá</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Gửi Đánh Giá</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
