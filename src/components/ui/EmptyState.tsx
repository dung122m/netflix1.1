import React from "react";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  variant?: "default" | "card";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
  variant = "default",
}: EmptyStateProps) {
  const isCard = variant === "card";

  return (
    <div
      className={`flex flex-col items-center justify-center text-center max-w-lg mx-auto px-4 ${
        isCard ? "py-12 bg-zinc-900/40 rounded-2xl" : "py-20"
      } ${className}`}
    >
      <div
        className={`rounded-full flex items-center justify-center text-zinc-400 ${
          isCard ? "h-16 w-16 bg-zinc-900/80 mb-4" : "h-20 w-20 bg-zinc-900 mb-5"
        }`}
      >
        {icon}
      </div>
      <h2
        className={`${
          isCard ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
        } font-bold mb-2 text-white`}
      >
        {title}
      </h2>
      {description && (
        <div
          className={`text-zinc-400 leading-relaxed ${
            isCard ? "text-xs sm:text-sm mb-5" : "text-sm mb-6"
          }`}
        >
          {typeof description === "string" ? <p>{description}</p> : description}
        </div>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;

