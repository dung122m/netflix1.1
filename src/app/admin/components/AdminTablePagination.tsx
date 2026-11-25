"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function useClientPagination<T>(
  items: T[],
  initialPageSize: number,
  resetKey: string,
) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [resetKey]);

  const totalFiltered = items.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  );

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 3) {
      return [1, 2, 3, 4, "...", totalPages];
    }
    if (safePage >= totalPages - 2) {
      return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages];
  }, [safePage, totalPages]);

  const handlePageSizeChange = useCallback((nextSize: number) => {
    setPageSize(nextSize);
    setCurrentPage(1);
  }, []);

  return {
    currentPage: safePage,
    setCurrentPage,
    pageSize,
    handlePageSizeChange,
    totalFiltered,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    pageNumbers,
  };
}

interface AdminTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalFiltered: number;
  startIndex: number;
  endIndex: number;
  pageNumbers: Array<number | string>;
  itemLabel: string;
  onPageChange: (page: number) => void;
  scrollTargetRef?: React.RefObject<HTMLDivElement | null>;
}

export const AdminTablePagination: React.FC<AdminTablePaginationProps> = React.memo(
  function AdminTablePagination({
    currentPage,
    totalPages,
    totalFiltered,
    startIndex,
    endIndex,
    pageNumbers,
    itemLabel,
    onPageChange,
    scrollTargetRef,
  }) {
    if (totalPages <= 1) return null;

    const goToPage = (nextPage: number) => {
      onPageChange(nextPage);
      scrollTargetRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs text-zinc-400">
        <span className="font-sans tabular-nums text-zinc-400">
          Đang hiển thị mục <strong className="text-white">{startIndex + 1}</strong> -{" "}
          <strong className="text-white">{endIndex}</strong> trong số{" "}
          <strong className="text-white">{totalFiltered}</strong> {itemLabel}
        </span>

        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-200 hover:text-white font-medium transition flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft size={13} />
            <span>Trước</span>
          </button>

          <div className="flex items-center gap-1">
            {pageNumbers.map((p, idx) =>
              typeof p === "number" ? (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToPage(p)}
                  className={`min-w-8 h-8 px-2 rounded-xl font-sans tabular-nums text-xs font-semibold transition cursor-pointer ${
                    p === currentPage
                      ? "bg-netflix-red text-white shadow-md shadow-black/50"
                      : "bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-300 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ) : (
                <span key={idx} className="px-1 text-zinc-600 font-sans tabular-nums select-none">
                  ...
                </span>
              ),
            )}
          </div>

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-200 hover:text-white font-medium transition flex items-center gap-1 cursor-pointer"
          >
            <span>Sau</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  },
);
