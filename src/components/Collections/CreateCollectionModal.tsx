"use client";

import React, { useState, useEffect } from "react";
import { X, FolderPlus, Globe, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createCollection } from "@/services/collectionService";
import { MovieCollection } from "@/types/collection";
import { toast } from "@/components/Toast";

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newCollection: MovieCollection) => void;
}

export const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vui lòng đăng nhập để tạo bộ sưu tập!");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Vui lòng nhập tên bộ sưu tập!");
      return;
    }

    setLoading(true);
    try {
      const created = await createCollection(
        user.uid,
        user.displayName || user.email || "Thành viên Nanaflix",
        user.photoURL || undefined,
        trimmedName,
        description,
        isPublic
      );

      if (created) {
        toast.success(`Đã tạo bộ sưu tập "${created.name}" thành công!`);
        setName("");
        setDescription("");
        setIsPublic(true);
        if (onSuccess) onSuccess(created);
        onClose();
      } else {
        toast.error("Không thể tạo bộ sưu tập. Vui lòng thử lại sau!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi tạo bộ sưu tập.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.95)] text-white animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow hiệu ứng nền đỏ Netflix */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-netflix-red/20 rounded-full blur-3xl pointer-events-none" />

        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tiêu đề */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-netflix-red/20 text-netflix-red flex items-center justify-center border border-netflix-red/30 shadow-md">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Tạo Bộ Sưu Tập Mới</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Tổ chức phim theo chủ đề yêu thích và chia sẻ bạn bè
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Tên bộ sưu tập <span className="text-netflix-red">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={60}
              placeholder="VD: Phim Chiếu Rạp Đỉnh Cao, Anime Mùa Hè..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-netflix-red focus:ring-1 focus:ring-netflix-red transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Mô tả ngắn gọn (tùy chọn)
            </label>
            <textarea
              rows={2}
              maxLength={200}
              placeholder="Ghi chú về tuyển tập này..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-900/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-netflix-red focus:ring-1 focus:ring-netflix-red transition resize-none"
            />
          </div>

          {/* Chế độ chia sẻ: Công khai / Riêng tư */}
          <div className="rounded-2xl border border-white/15 bg-zinc-900/60 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isPublic ? (
                  <Globe className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-400" />
                )}
                <div>
                  <p className="text-xs font-bold text-white">
                    {isPublic ? "Bộ sưu tập Công Khai" : "Bộ sưu tập Riêng Tư"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {isPublic
                      ? "Bất kỳ ai có link đều có thể xem danh sách phim này"
                      : "Chỉ một mình bạn có thể nhìn thấy danh sách này"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  isPublic ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition cursor-pointer active:scale-95"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Đang tạo..." : "Tạo bộ sưu tập"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
