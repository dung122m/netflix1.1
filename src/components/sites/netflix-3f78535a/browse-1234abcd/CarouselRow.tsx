import React from "react";
import { MediaCard } from "./MediaCard";
import { normalizeMovie } from "@/lib/movieMedia";

interface CarouselRowProps {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: Array<any>;
}

export const CarouselRow: React.FC<CarouselRowProps> = ({ title, items }) => {
  return (
    <div className="py-6 px-4 sm:px-8">
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      <div
        data-lenis-prevent
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => {
          const norm = normalizeMovie(item);
          return (
            <div key={norm.slug || index} className="w-[260px] sm:w-[300px] flex-none">
              <MediaCard
                slug={norm.slug}
                title={norm.title}
                origin_name={norm.origin_name}
                imageUrl={norm.imageUrl}
                genre={norm.genre}
                description={norm.description}
                time={norm.time}
                year={norm.year}
                rating={norm.score}
                quality={norm.quality}
                lang={norm.lang}
                chieurap={norm.chieurap}
                sub_docquyen={norm.sub_docquyen}
                actor={norm.actor}
                director={norm.director}
                country={norm.country}
                type_name={norm.type_name}
                hasTrailer={norm.hasTrailer}
                trailer_url={norm.trailer_url}
                isTrailerOnly={norm.isTrailerOnly}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
