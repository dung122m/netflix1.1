"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, FolderHeart, Search, Trash2 } from "lucide-react";
import { MovieCollection } from "@/types/collection";

interface AdminCollectionsTabProps {
  filteredCollections: MovieCollection[];
  colSearchQuery: string;
  setColSearchQuery: (q: string) => void;
  onDeleteCollection: (col: MovieCollection) => void;
  formatDate: (timestamp?: number) => string;
}

export const AdminCollectionsTab: React.FC<AdminCollectionsTabProps> = React.memo(
  function AdminCollectionsTab({
    filteredCollections,
    colSearchQuery,
    setColSearchQuery,
    onDeleteCollection,
    formatDate,
  }) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={colSearchQuery}
              onChange={(e) => setColSearchQuery(e.target.value)}
              placeholder="Tìm theo tên bộ sưu tập, người tạo..."
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
            />
          </div>
          <div className="text-xs text-gray-400">
            Tổng số: <strong className="text-white">{filteredCollections.length}</strong> bộ sưu tập công khai
          </div>
        </div>

        {filteredCollections.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-white/10">
            <FolderHeart size={36} className="text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-300">Chưa có bộ sưu tập công khai nào</p>
            <p className="text-xs text-gray-500 mt-1">Khi người dùng chia sẻ bộ sưu tập lên cộng đồng, chúng sẽ xuất hiện ở đây.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCollections.map((col) => (
              <div
                key={col.id}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                      {col.movies?.length || 0} phim
                    </span>
                    <span className="text-[10px] text-gray-500">{formatDate(col.updatedAt)}</span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-netflix-red transition">
                    {col.name}
                  </h3>
                  {col.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1">{col.description}</p>
                  )}
                  <p className="text-[11px] text-gray-500 mt-2">
                    Người tạo: <strong className="text-gray-300">{col.creatorName || col.userId}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                  <Link
                    href={`/collection/${col.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold text-center transition flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={13} />
                    <span>Xem chi tiết</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDeleteCollection(col)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                    title="Gỡ khỏi công khai"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
