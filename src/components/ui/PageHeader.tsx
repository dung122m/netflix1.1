import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  align?: "left" | "center";
  size?: "default" | "large";
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  badge,
  backHref,
  backLabel = "Quay lại",
  breadcrumbs,
  actions,
  align = "left",
  size = "default",
  className = "",
}: PageHeaderProps) {
  const isCenter = align === "center";
  const isLarge = size === "large";

  const hasBreadcrumbs = Boolean(
    backHref || (breadcrumbs && breadcrumbs.length > 0)
  );

  return (
    <div
      className={`w-full space-y-4 select-none ${
        isCenter ? "text-center max-w-4xl mx-auto" : ""
      } ${className}`}
    >
      {/* 1. BREADCRUMBS & BACK NAVIGATION */}
      {hasBreadcrumbs && (
        <nav
          aria-label="Breadcrumb"
          className={`flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-400 min-w-0 ${
            isCenter ? "justify-center" : "justify-start"
          }`}
        >
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 min-h-[34px] rounded-full shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{backLabel}</span>
            </Link>
          )}

          {backHref && breadcrumbs && breadcrumbs.length > 0 && (
            <span className="text-zinc-600" aria-hidden="true">
              •
            </span>
          )}

          {breadcrumbs?.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <span className="text-zinc-600" aria-hidden="true">
                    /
                  </span>
                )}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-white transition-colors truncate max-w-[160px] sm:max-w-none"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={`${
                      isLast ? "text-zinc-200" : "text-zinc-400"
                    } truncate max-w-[200px] sm:max-w-none`}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* 2. OPTIONAL TOP BADGE / PILL */}
      {badge && (
        <div
          className={`flex ${isCenter ? "justify-center" : "justify-start"}`}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.05] text-xs font-medium text-zinc-300">
            {badge}
          </div>
        </div>
      )}

      {/* 3. MAIN HEADER ROW: ICON + TITLE + SUBTITLE + ACTIONS */}
      {(title || actions) && (
        <div
          className={`flex flex-col ${
            isCenter
              ? "items-center"
              : "md:flex-row md:items-end md:justify-between"
          } gap-4`}
        >
          {title && (
            <div className={`space-y-1.5 min-w-0 ${isCenter ? "max-w-2xl" : ""}`}>
              <h1
                className={`font-black text-white tracking-tight leading-tight flex items-center gap-2.5 sm:gap-3 flex-wrap ${
                  isCenter ? "justify-center" : "justify-start"
                } ${
                  isLarge
                    ? "text-3xl sm:text-5xl md:text-6xl"
                    : "text-2xl sm:text-3xl md:text-4xl"
                }`}
              >
                {icon && (
                  <span className="shrink-0 flex items-center justify-center">
                    {icon}
                  </span>
                )}
                <span>{title}</span>
              </h1>

              {subtitle && (
                <p
                  className={`text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed ${
                    isCenter ? "mx-auto" : "max-w-[70ch]"
                  }`}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* 4. ACTIONS WRAPPER */}
          {actions && (
            <div
              className={`flex items-center flex-wrap gap-3 shrink-0 ${
                isCenter ? "justify-center pt-2" : "justify-start md:justify-end"
              }`}
            >
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
