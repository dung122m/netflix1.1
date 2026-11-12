import React from "react";

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "Vừa xong";
  const diff = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  const date = new Date(timestamp);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function renderCommentContent(text: string, replyToUserName?: string) {
  if (replyToUserName && text.startsWith(`@${replyToUserName}`)) {
    const mention = `@${replyToUserName}`;
    const rest = text.slice(mention.length);
    return (
      <>
        <span className="text-netflix-red font-semibold inline-block mr-1">
          {mention}
        </span>
        {rest}
      </>
    );
  }
  const parts = text.split(/(@[^\s@]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span
          key={index}
          className="text-netflix-red font-semibold inline-block mr-0.5"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

