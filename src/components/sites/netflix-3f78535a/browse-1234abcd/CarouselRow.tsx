import React from "react";
import { MediaCard } from "./MediaCard";

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
        {items.map((item, index) => (
          <div key={item.slug || index} className="w-[260px] sm:w-[300px] flex-none">
            <MediaCard
              slug={item.slug}
              title={item.title || item.name}
              origin_name={item.origin_name}
              imageUrl={item.imageUrl || item.thumb_url || item.poster_url}
              genre={item.genre}
              description={item.description}
              time={item.time}
              year={item.year}
              rating={item.rating || item.score}
              quality={item.quality}
              lang={item.lang}
              chieurap={item.chieurap}
              sub_docquyen={item.sub_docquyen}
              hasTrailer={item.hasTrailer || Boolean(item.trailer_url) || item.isTrailerOnly}
              trailer_url={item.trailer_url}
              isTrailerOnly={item.isTrailerOnly}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
