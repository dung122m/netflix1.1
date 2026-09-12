"use client";

import React, { useState, useRef, useEffect } from "react";
import { ThumbsUp } from "lucide-react";
import { CommentReactionType, MovieComment } from "@/types/comment";

export interface ReactionConfig {
  type: CommentReactionType;
  label: string;
  emoji: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

export const REACTIONS_CONFIG: Record<CommentReactionType, ReactionConfig> = {
  like: {
    type: "like",
    label: "Thích",
    emoji: "👍",
    color: "#3b82f6",
    textColor: "text-blue-400 font-semibold",
    bgColor: "bg-blue-500/15",
    borderColor: "border-blue-500/30",
  },
  love: {
    type: "love",
    label: "Yêu thích",
    emoji: "❤️",
    color: "#f43f5e",
    textColor: "text-rose-400 font-semibold",
    bgColor: "bg-rose-500/15",
    borderColor: "border-rose-500/30",
  },
  haha: {
    type: "haha",
    label: "Haha",
    emoji: "😆",
    color: "#eab308",
    textColor: "text-amber-400 font-semibold",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
  },
  wow: {
    type: "wow",
    label: "Wow",
    emoji: "😮",
    color: "#f59e0b",
    textColor: "text-amber-300 font-semibold",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
  },
  sad: {
    type: "sad",
    label: "Buồn",
    emoji: "😢",
    color: "#eab308",
    textColor: "text-yellow-400 font-semibold",
    bgColor: "bg-yellow-500/15",
    borderColor: "border-yellow-500/30",
  },
  angry: {
    type: "angry",
    label: "Phẫn nộ",
    emoji: "😡",
    color: "#ef4444",
    textColor: "text-red-400 font-semibold",
    bgColor: "bg-red-500/15",
    borderColor: "border-red-500/30",
  },
};

const REACTION_LIST: CommentReactionType[] = ["like", "love", "haha", "wow", "sad", "angry"];

interface ReactionPickerProps {
  comment: MovieComment;
  currentUserId?: string | null;
  onReact: (reactionType: CommentReactionType | null) => void;
  onRequireAuth?: () => void;
  isCompact?: boolean;
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  comment,
  currentUserId,
  onReact,
  onRequireAuth,
  isCompact = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<CommentReactionType | null>(null);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Xác định reaction hiện tại của user
  const userReaction: CommentReactionType | null = (() => {
    if (!currentUserId) return null;
    if (comment.reactions && comment.reactions[currentUserId]) {
      return comment.reactions[currentUserId];
    }
    // Backward compatibility: nếu trong likedBy có user mà chưa có trong reactions map -> mặc định là "like"
    if (comment.likedBy?.includes(currentUserId)) {
      return "like";
    }
    return null;
  })();

  const currentConfig = userReaction ? REACTIONS_CONFIG[userReaction] : null;

  // Lấy danh sách các emoji phổ biến nhất trong comment để hiển thị badge
  const topReactions = (() => {
    const counts: { type: CommentReactionType; count: number }[] = [];

    if (comment.reactionCounts) {
      Object.entries(comment.reactionCounts).forEach(([type, count]) => {
        if (typeof count === "number" && count > 0 && REACTIONS_CONFIG[type as CommentReactionType]) {
          counts.push({ type: type as CommentReactionType, count });
        }
      });
    } else if (comment.reactions) {
      const tally: Partial<Record<CommentReactionType, number>> = {};
      Object.values(comment.reactions).forEach((t) => {
        tally[t] = (tally[t] || 0) + 1;
      });
      Object.entries(tally).forEach(([type, count]) => {
        if (count && count > 0) {
          counts.push({ type: type as CommentReactionType, count });
        }
      });
    }

    // Nếu không có phân loại cụ thể nhưng có likes > 0 -> hiển thị 👍
    if (counts.length === 0 && comment.likes > 0) {
      counts.push({ type: "like", count: comment.likes });
    }

    counts.sort((a, b) => b.count - a.count);
    return counts.slice(0, 3);
  })();

  const totalReactionsCount = comment.likes || 0;

  // Xử lý mở/đóng reaction picker
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setShowPicker(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setShowPicker(false);
      setHoveredReaction(null);
    }, 250);
  };

  // Xử lý chạm giữ (Long Press) trên màn hình cảm ứng điện thoại
  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setShowPicker(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 300);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // Đóng picker khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleButtonClick = () => {
    if (!currentUserId) {
      onRequireAuth?.();
      return;
    }

    if (showPicker) {
      setShowPicker(false);
      return;
    }

    if (userReaction) {
      // Đã có cảm xúc -> Bấm vào để bỏ cảm xúc
      onReact(null);
    } else {
      // Chưa có -> Mặc định Like 👍
      onReact("like");
    }
  };

  const handleSelectReaction = (type: CommentReactionType, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!currentUserId) {
      setShowPicker(false);
      onRequireAuth?.();
      return;
    }

    if (userReaction === type) {
      // Bấm trùng -> Gỡ bỏ
      onReact(null);
    } else {
      // Chọn cảm xúc mới
      onReact(type);
    }
    setShowPicker(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center gap-1.5 select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* FLOATING FACEBOOK REACTION BAR */}
      {showPicker && (
        <div
          className={`absolute bottom-full mb-2.5 left-0 z-40 flex items-center gap-1 px-2 py-1.5 bg-zinc-950/95 border border-white/20 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-150 ${
            isCompact ? "scale-90 origin-bottom-left" : ""
          }`}
        >
          {REACTION_LIST.map((type) => {
            const config = REACTIONS_CONFIG[type];
            const isHovered = hoveredReaction === type;
            const isSelected = userReaction === type;

            return (
              <button
                key={type}
                type="button"
                onClick={(e) => handleSelectReaction(type, e)}
                onTouchEnd={(e) => handleSelectReaction(type, e)}
                onMouseEnter={() => setHoveredReaction(type)}
                onMouseLeave={() => setHoveredReaction(null)}
                className={`group/emoji relative flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-full cursor-pointer transition-all duration-150 ${
                  isSelected ? "bg-white/15 ring-1 ring-white/30 scale-110" : "hover:bg-white/10"
                }`}
                aria-label={config.label}
              >
                {/* TOOLTIP LABEL BAY LÊN TRÊN EMOJI */}
                {isHovered && (
                  <span className="absolute -top-7 px-2 py-0.5 rounded-full bg-zinc-900/95 border border-white/15 text-[10px] font-bold text-white whitespace-nowrap shadow-md pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-100">
                    {config.label}
                  </span>
                )}

                {/* EMOJI ICON WITH BOUNCE SCALING */}
                <span
                  className={`text-xl sm:text-2xl transition-transform duration-150 inline-block transform ${
                    isHovered
                      ? "-translate-y-2 scale-135 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                      : "hover:scale-120 active:scale-95"
                  }`}
                >
                  {config.emoji}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* REACTION BUTTON CHÍNH */}
      <button
        type="button"
        onClick={handleButtonClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all cursor-pointer active:scale-95 ${
          currentConfig
            ? `${currentConfig.bgColor} ${currentConfig.textColor} border ${currentConfig.borderColor}`
            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
        }`}
      >
        {currentConfig ? (
          <>
            <span className="text-sm sm:text-base leading-none animate-in zoom-in-75 duration-100">
              {currentConfig.emoji}
            </span>
            <span>{currentConfig.label}</span>
          </>
        ) : (
          <>
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Thích</span>
          </>
        )}
      </button>

      {/* TOP REACTIONS STACKED BADGE & TOTAL COUNT */}
      {totalReactionsCount > 0 && (
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer"
          title={`${totalReactionsCount} lượt bày tỏ cảm xúc`}
        >
          {/* Overlapping top emojis badge (Facebook style) */}
          <div className="flex items-center -space-x-1 flex-shrink-0">
            {topReactions.map((item, idx) => (
              <span
                key={item.type}
                className="text-xs sm:text-sm inline-block transform transition-transform hover:scale-125 hover:z-10"
                style={{ zIndex: 3 - idx }}
              >
                {REACTIONS_CONFIG[item.type]?.emoji || "👍"}
              </span>
            ))}
          </div>

          <span className="font-semibold text-zinc-300 ml-0.5">
            {totalReactionsCount}
          </span>
        </button>
      )}
    </div>
  );
};
