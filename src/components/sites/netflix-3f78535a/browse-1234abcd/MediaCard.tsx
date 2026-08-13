import React from 'react';
import Link from 'next/link';

interface MediaCardProps {
  slug: string;
  title: string;
  imageUrl: string;
  genre: string;
  description: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({ slug, title, imageUrl, genre, description }) => {
  return (
    <Link href={`/movies/${slug}`}>
      <div className="relative group min-w-[280px] h-[160px] rounded overflow-hidden cursor-pointer transition-all duration-300 hover:scale-110 hover:z-20 bg-gray-800">
        <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-4 transition-opacity duration-300">
          <h4 className="text-white font-bold text-lg">{title}</h4>
          <p className="text-netflix-red text-sm font-semibold">{genre}</p>
          <p className="text-gray-300 text-xs mt-1 line-clamp-2">{description}</p>
        </div>
      </div>
    </Link>
  );
};
