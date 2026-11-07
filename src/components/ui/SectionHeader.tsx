import React from "react";

export interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  /** Nếu true: bọc icon trong hộp đỏ bo tròn chuẩn w-6 h-6 / w-7 h-7 bg-netflix-red */
  iconBadge?: boolean;
  trailingBadge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  variant?: "default" | "compact";
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  iconBadge = false,
  trailingBadge,
  actions,
  className = "",
  variant = "default",
}: SectionHeaderProps) {
  const isCompact = variant === "compact";

  if (isCompact) {
    return (
      <div className={`flex items-center justify-between mb-3 px-0 ${className}`}>
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span className={`inline-flex items-center justify-center shrink-0 ${iconBadge ? "text-netflix-red" : "text-zinc-300"}`}>
              {icon}
            </span>
          )}
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate flex items-center gap-2">
            <span>{title}</span>
            {trailingBadge}
          </h2>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5 px-0 ${className}`}
    >
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl md:text-[26px] font-black tracking-tight text-white flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {icon && (
            <span
              className={`inline-flex items-center justify-center shrink-0 ${
                iconBadge ? "text-netflix-red" : "text-zinc-300"
              }`}
            >
              {icon}
            </span>
          )}
          <span className="truncate">{title}</span>
          {trailingBadge}
        </h2>
        {subtitle && (
          <p className="mt-1 text-xs sm:text-sm text-zinc-400 max-w-[65ch] leading-relaxed line-clamp-2">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export default SectionHeader;

