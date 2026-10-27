"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip } from "./Tooltip";

export interface ScrollablePillsRowProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  scrollAmount?: number;
}

export function ScrollablePillsRow({
  children,
  className = "",
  innerClassName = "flex items-center gap-1.5 py-0.5",
  scrollAmount = 180,
}: ScrollablePillsRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag-to-scroll state
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
    });
    resizeObserver.observe(el);

    window.addEventListener("resize", checkScroll);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const handleScrollBy = useCallback(
    (amount: number) => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollBy({ left: amount, behavior: "smooth" });
      setTimeout(checkScroll, 250);
    },
    [checkScroll],
  );

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    // Nếu có delta theo chiều dọc hoặc ngang, hỗ trợ cuộn ngang mượt mà
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      if (
        (e.deltaY < 0 && el.scrollLeft > 0) ||
        (e.deltaY > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
      ) {
        el.scrollLeft += e.deltaY;
        checkScroll();
      }
    } else if (Math.abs(e.deltaX) > 0) {
      el.scrollLeft += e.deltaX;
      checkScroll();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    isDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDownRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    isDownRef.current = false;
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    // Nếu người dùng vừa kéo chuột để cuộn, không kích hoạt click vào pill
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDraggedRef.current = false;
    }
  };

  return (
    <div className={`relative group/scroll flex items-center min-w-0 ${className}`}>
      {/* Nút cuộn trái (chỉ hiện khi hover vào hàng pills trên desktop) */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 hidden sm:flex items-center pl-0.5 pr-6 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200">
          <Tooltip content="Cuộn sang trái" side="right">
            <button
              type="button"
              onClick={() => handleScrollBy(-scrollAmount)}
              className="w-7 h-7 rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white border border-white/25 shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto backdrop-blur-md"
              aria-label="Cuộn sang trái"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-200" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Dải pills cuộn */}
      <div
        ref={containerRef}
        onScroll={checkScroll}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleClickCapture}
        className={`w-full min-w-0 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden select-none cursor-grab active:cursor-grabbing touch-pan-x ${innerClassName}`}
      >
        {children}
      </div>

      {/* Nút cuộn phải (chỉ hiện khi hover vào hàng pills trên desktop) */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-10 hidden sm:flex items-center pr-0.5 pl-6 bg-gradient-to-l from-zinc-950 via-zinc-950/90 to-transparent pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-200">
          <Tooltip content="Cuộn sang phải" side="left">
            <button
              type="button"
              onClick={() => handleScrollBy(scrollAmount)}
              className="w-7 h-7 rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white border border-white/25 shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto backdrop-blur-md"
              aria-label="Cuộn sang phải"
            >
              <ChevronRight className="w-4 h-4 text-zinc-200" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
