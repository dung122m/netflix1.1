import React from "react";
import { MediaCard } from "./MediaCard";

interface CarouselRowProps {
  title: string;
  items: Array<{
    slug: string;
    title: string;
    imageUrl: string;
    genre: string;
    description: string;
  }>;
}

export const CarouselRow: React.FC<CarouselRowProps> = ({ title, items }) => {
  return (
    <div className="py-6 px-8">
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {items.map((item) => (
          <MediaCard
            key={item.slug}
            slug={item.slug}
            title={item.title}
            imageUrl={item.imageUrl}
            genre={item.genre}
            description={item.description}
          />
        ))}
      </div>
    </div>
  );
};
