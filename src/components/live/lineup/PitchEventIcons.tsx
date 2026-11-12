"use client";

import React from "react";

/**
 * Thẻ Vàng thể thao phẳng chuẩn tỷ lệ 2:3
 */
export function YellowCardIcon({ className = "w-2.5 h-3.5" }: { className?: string }) {
  return (
    <span
      className={`rounded-[1.5px] bg-amber-400 shadow-sm inline-block shrink-0 ${className}`}
      aria-label="Thẻ vàng"
    />
  );
}

/**
 * Thẻ Đỏ thể thao phẳng chuẩn tỷ lệ 2:3
 */
export function RedCardIcon({ className = "w-2.5 h-3.5" }: { className?: string }) {
  return (
    <span
      className={`rounded-[1.5px] bg-red-600 shadow-sm inline-block shrink-0 ${className}`}
      aria-label="Thẻ đỏ"
    />
  );
}

