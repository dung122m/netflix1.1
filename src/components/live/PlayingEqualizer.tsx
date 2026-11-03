import React from "react";

export function PlayingEqualizer({
  className = "",
  barColor = "bg-emerald-400",
}: {
  className?: string;
  barColor?: string;
}) {
  return (
    <div className={`flex items-end gap-0.5 h-3 px-1 ${className}`}>
      <span className={`w-0.5 ${barColor} rounded-full animate-pulse [animation-duration:1.2s] h-3`} />
      <span className={`w-0.5 ${barColor} rounded-full animate-pulse [animation-duration:0.8s] h-2`} />
      <span className={`w-0.5 ${barColor} rounded-full animate-pulse [animation-duration:1s] h-3`} />
    </div>
  );
}


