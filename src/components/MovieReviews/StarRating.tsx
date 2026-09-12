"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  showLabel?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  1: "Rất tệ 😴",
  2: "Tạm ổn 🙂",
  3: "Khá hay 👍",
  4: "Rất đáng xem 🔥",
  5: "Tuyệt phẩm 10/10! 🏆",
};

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  size = "md",
  readOnly = false,
  showLabel = false,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const starSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5 md:w-6 md:h-6",
    lg: "w-7 h-7 md:w-8 md:h-8",
  };

  const activeRating = hoverValue ?? value;

  return (
    <div className="inline-flex items-center gap-2 select-none">
      {/* Container của các sao: onMouseLeave đặt ở đây để tránh giật khi lia chuột giữa các sao */}
      <div
        className="flex items-center"
        onMouseLeave={() => {
          if (!readOnly) setHoverValue(null);
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating;
          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              onClick={() => onChange && onChange(star)}
              onMouseEnter={() => {
                if (!readOnly) setHoverValue(star);
              }}
              className={`p-1 flex items-center justify-center ${
                readOnly
                  ? "cursor-default"
                  : "cursor-pointer focus:outline-none"
              }`}
              title={readOnly ? `${value} sao` : RATING_LABELS[star]}
              aria-label={`${star} sao`}
            >
              <Star
                className={`${starSizes[size]} transition-colors duration-150 ${
                  isFilled
                    ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]"
                    : "fill-transparent text-zinc-600"
                }`}
              />
            </button>
          );
        })}
      </div>

      {showLabel && (
        <span className="text-xs md:text-sm font-semibold text-amber-400 w-36 pl-1 inline-block select-none truncate">
          {activeRating > 0 ? RATING_LABELS[activeRating] : ""}
        </span>
      )}
    </div>
  );
};
