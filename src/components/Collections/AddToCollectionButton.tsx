"use client";

import React, { useState } from "react";
import { FolderPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { AddToCollectionModal } from "./AddToCollectionModal";

interface AddToCollectionButtonProps {
  movie: {
    slug: string;
    title: string;
    poster: string;
    year?: string | number;
    quality?: string;
    category?: string;
  };
  variant?: "default" | "player";
  className?: string;
}

export const AddToCollectionButton: React.FC<AddToCollectionButtonProps> = ({
  movie,
  variant = "default",
  className = "",
}) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setShowModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Thêm phim vào bộ sưu tập cá nhân"
        aria-label="Bộ sưu tập"
        className={`inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm flex-shrink-0 ${
          variant === "player"
            ? "px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-xs font-medium"
            : "px-3 sm:px-3.5 py-1.5 rounded-lg border text-xs sm:text-sm font-medium bg-zinc-900/80 hover:bg-zinc-800 text-gray-200 hover:text-white border-white/15"
        } ${className}`}
      >
        <FolderPlus
          className={`flex-shrink-0 ${
            variant === "player" ? "w-3.5 h-3.5" : "w-3.5 h-3.5 sm:w-4 sm:h-4"
          } text-amber-400`}
        />
        <span className="hidden sm:inline">Bộ sưu tập</span>
      </button>

      {/* Modal danh sách bộ sưu tập */}
      <AddToCollectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        movie={movie}
      />

      {/* Modal đăng nhập */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        customTitle="Đăng nhập để tạo và lưu bộ sưu tập phim"
      />
    </>
  );
};

export default AddToCollectionButton;
