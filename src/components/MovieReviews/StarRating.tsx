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
  5: "Tuyệt phẩm 10/10! ⭐⭐⭐⭐⭐",
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
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const activeRating = hoverValue ?? value;

  return (
    <div className="inline-flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating;
          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              onClick={() => onChange && onChange(star)}
              onMouseEnter={() => !readOnly && setHoverValue(star)}
              onMouseLeave={() => !readOnly && setHoverValue(null)}
              className={`transition-all transform ${
                readOnly
                  ? "cursor-default"
                  : "cursor-pointer hover:scale-125 active:scale-95 focus:outline-none"
              }`}
              title={readOnly ? `${value} sao` : RATING_LABELS[star]}
              aria-label={`${star} sao`}
            >
              <Star
                className={`${starSizes[size]} transition-colors duration-150 ${
                  isFilled
                    ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                    : "fill-transparent text-zinc-600 hover:text-zinc-400"
                }`}
              />
            </button>
          );
        })}
      </div>

      {showLabel && activeRating > 0 && (
        <span className="text-xs md:text-sm font-medium text-amber-400 animate-fadeIn">
          {RATING_LABELS[activeRating]}
        </span>
      )}
    </div>
  );
};
