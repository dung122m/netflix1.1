"use client";

import React, { useState, useEffect } from "react";
import { getAvatarGradient, getAvatarInitial } from "@/lib/avatarHelper";

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  seed?: string | null;
  className?: string;
  imgClassName?: string;
  sizeClassName?: string;
  rounded?: "full" | "xl" | "2xl" | "3xl" | "none";
  alt?: string;
  badge?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  title?: string;
}

/**
 * Component Avatar người dùng chuẩn Netflix
 * - Tự động hiển thị chữ cái đầu trên nền gradient tuyệt đẹp khi chưa có ảnh hoặc khi ảnh tải lỗi.
 * - Hỗ trợ `referrerPolicy="no-referrer"` tránh lỗi Google 403.
 * - Hoàn toàn không bao giờ xuất hiện icon ảnh vỡ (broken image icon).
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  seed,
  className = "",
  imgClassName = "",
  sizeClassName = "w-10 h-10 text-sm",
  rounded = "full",
  alt,
  badge,
  onClick,
  title,
}) => {
  const [imgError, setImgError] = useState(false);

  // Reset imgError khi src thay đổi
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initial = getAvatarInitial(name || seed);
  const gradient = getAvatarGradient(seed || name);

  const roundedClasses = {
    full: "rounded-full",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    "3xl": "rounded-3xl",
    none: "rounded-none",
  }[rounded];

  const hasImage = Boolean(src && src.trim() && !imgError);

  return (
    <div
      onClick={onClick}
      title={title || name || "Avatar"}
      className={`relative inline-flex items-center justify-center select-none overflow-hidden flex-shrink-0 bg-gradient-to-br ${gradient} font-bold text-white uppercase tracking-wider ${roundedClasses} ${sizeClassName} ${className}`}
    >
      {/* Chữ cái viết hoa mặc định luôn nằm dưới hoặc hiển thị khi không có ảnh */}
      <span className="leading-none">{initial}</span>

      {/* Ảnh đại diện nếu có và chưa bị lỗi */}
      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src || undefined}
          alt={alt || name || "User avatar"}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`absolute inset-0 w-full h-full object-cover ${roundedClasses} ${imgClassName}`}
        />
      )}

      {/* Badge overlay nếu có */}
      {badge && <div className="absolute bottom-0 right-0 z-10">{badge}</div>}
    </div>
  );
};
