"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ScrollablePillsRowProps {
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
      {/* Nút cuộn trái */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-2 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent">
          <button
            type="button"
            onClick={() => handleScrollBy(-scrollAmount)}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-white border border-white/20 shadow-lg flex items-center justify-center transition active:scale-90 cursor-pointer"
            title="Cuộn sang trái"
            aria-label="Cuộn sang trái"
          >
            <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
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
        className={`w-full overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden shrink-0 select-none cursor-grab active:cursor-grabbing ${innerClassName}`}
      >
        {children}
      </div>

      {/* Nút cuộn phải */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-2 bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent">
          <button
            type="button"
            onClick={() => handleScrollBy(scrollAmount)}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-white border border-white/20 shadow-lg flex items-center justify-center transition active:scale-90 cursor-pointer"
            title="Cuộn sang phải"
            aria-label="Cuộn sang phải"
          >
            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
