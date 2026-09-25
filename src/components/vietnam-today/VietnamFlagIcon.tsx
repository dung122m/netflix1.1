import React from "react";

interface VietnamFlagIconProps {
  className?: string;
}

export function VietnamFlagIcon({ className = "w-5 h-3.5" }: VietnamFlagIconProps) {
  return (
    <svg
      viewBox="0 0 30 20"
      className={`inline-block rounded-[2px] shadow-sm flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect width="30" height="20" fill="#DA251D" />
      <polygon
        points="15,4 16.35,8.15 20.71,8.15 17.18,10.71 18.53,14.85 15,12.29 11.47,14.85 12.82,10.71 9.29,8.15 13.65,8.15"
        fill="#FFFF00"
      />
    </svg>
  );
}
