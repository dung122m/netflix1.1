import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";

interface MediaCardProps {
  slug: string;
  title: string;
  imageUrl: string;
  genre: string;
  description: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  slug,
  title,
  imageUrl,
  genre,
  description,
}) => {
  return (
    <Link href={`/movies/${slug}`} className="snap-start">
      <div className="group relative h-40 min-w-70 cursor-pointer overflow-hidden rounded-md bg-gray-900 shadow-md transition-transform duration-300 ease-out will-change-transform hover:z-20 hover:scale-105">
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 280px"
          className="object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-110"
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 flex flex-col justify-between bg-black/70 p-3 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100">
          {/* Center: Play Button */}
          <div className="flex-grow flex items-center justify-center">
            <div className="bg-white/20 text-white rounded-full p-3 backdrop-blur-sm border border-white/30 hover:bg-white hover:text-black transition">
              <Play className="w-6 h-6 fill-current" />
            </div>
          </div>

          {/* Bottom: Text Info */}
          <div>
            <h4 className="text-white font-bold text-sm line-clamp-1">
              {title}
            </h4>
            <p className="text-green-500 text-[10px] font-semibold">{genre}</p>
            <p className="text-gray-300 text-[9px] mt-1 line-clamp-2">
              {description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};
