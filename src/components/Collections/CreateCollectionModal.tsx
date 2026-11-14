"use client";

import React, { useState, useEffect } from "react";
import { FolderPlus, Globe, Lock, Loader2, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createCollection } from "@/services/collectionService";
import { uploadCollectionCoverSupabase } from "@/services/supabaseService";
import { MovieCollection } from "@/types/collection";
import { toast } from "@/components/ui/Toast";
import { subscribeUserProfile } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { BaseModal } from "@/components/ui/BaseModal";

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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      return;
    }
    const unsub = subscribeUserProfile(user.uid, (p) => {
      if (p) setUserProfile(p);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      toast.error("Vui lòng đăng nhập để tạo bộ sưu tập!");
      return;
    }

    if (!name.trim()) {
      toast.error("Vui lòng nhập tên bộ sưu tập!");
      return;
    }

    setLoading(true);
    try {
      const creatorName = userProfile?.displayName || user.displayName || user.email || "Thành viên Nanaflix";
      const creatorPhoto = userProfile?.customAvatar || userProfile?.photoURL || user.photoURL || undefined;

      let coverUrl: string | undefined = undefined;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop() || "webp";
        const uploaded = await uploadCollectionCoverSupabase(user.uid, coverFile, ext);
        if (uploaded) {
          coverUrl = uploaded;
        }
      }

      const created = await createCollection(
        user.uid,
        creatorName,
        creatorPhoto,
        name.trim(),
        description,
        isPublic,
        coverUrl
      );

      if (created) {
        toast.success(`Đã tạo bộ sưu tập "${created.name}" thành công!`);
        setName("");
        setDescription("");
        setIsPublic(true);
        setCoverFile(null);
        setCoverPreview(null);
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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Tạo Bộ Sưu Tập Mới"
      subtitle="Tổ chức phim theo chủ đề yêu thích và chia sẻ bạn bè"
      icon={<FolderPlus className="w-5 h-5 text-netflix-red" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Tên bộ sưu tập <span className="text-netflix-red">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={60}
            placeholder="VD: Phim Chiếu Rạp Đỉnh Cao, Anime Mùa Hè..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-netflix-red focus:ring-1 focus:ring-netflix-red transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Mô tả ngắn gọn (tùy chọn)
          </label>
          <textarea
            rows={2}
            maxLength={200}
            placeholder="Ghi chú về tuyển tập này..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-zinc-900/90 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-netflix-red focus:ring-1 focus:ring-netflix-red transition resize-none"
          />
        </div>

        {/* Tải ảnh bìa tuyển tập (Cloudflare R2 vĩnh viễn) */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Ảnh bìa / Banner tuyển tập (tùy chọn)
          </label>
          <div className="relative flex items-center gap-3">
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-netflix-red" />
              <span>{coverFile ? "Thay đổi ảnh..." : "Tải ảnh từ máy"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Kích thước ảnh tối đa là 5MB!");
                      return;
                    }
                    setCoverFile(file);
                    setCoverPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
            {coverPreview && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreview}
                  alt="Preview"
                  className="w-12 h-8 rounded-lg object-cover ring-1 ring-white/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
                  }}
                  className="text-[11px] text-zinc-400 hover:text-rose-400 transition"
                >
                  Xóa ảnh
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Hỗ trợ PNG, JPG, WEBP tối đa 5MB.
          </p>
        </div>

        {/* Quyền riêng tư */}
        <div className="pt-1">
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            Trạng thái hiển thị
          </label>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
            <div className="flex items-center gap-2.5">
              {isPublic ? (
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Globe className="w-4 h-4" />
                </div>
              ) : (
                <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-white">
                  {isPublic ? "Công khai" : "Riêng tư"}
                </span>
                <p className="text-[11px] text-zinc-400">
                  {isPublic
                    ? "Mọi người có thể xem và lưu bộ sưu tập này"
                    : "Chỉ bạn mới có thể xem bộ sưu tập này"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPublic ? "bg-netflix-red" : "bg-zinc-700"
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
            className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-black/50 transition cursor-pointer active:scale-95"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? "Đang tạo..." : "Tạo bộ sưu tập"}</span>
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default CreateCollectionModal;
