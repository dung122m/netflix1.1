import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CollectionClientView } from "@/components/Collections/CollectionClientView";
import { getPublicCollection } from "@/services/collectionService";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ u?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: CollectionPageProps) {
  const { id } = await params;
  const { u: userId } = await searchParams;

  const collection = await getPublicCollection(id, userId);

  if (!collection) {
    return {
      title: "Tuyển tập phim | Nanaflix",
      description: "Xem các bộ sưu tập phim được tuyển chọn đặc sắc trên Nanaflix.",
    };
  }

  const movieCount = collection.movies?.length || 0;
  const posterImage = collection.movies?.[0]?.poster || "";
  const title = `${collection.name} (${movieCount} phim) | Tuyển Tập Nanaflix VIP`;
  const description =
    collection.description ||
    `Khám phá bộ sưu tập phim "${collection.name}" tuyển chọn bởi ${collection.creatorName || "thành viên Nanaflix"}. Gồm ${movieCount} bộ phim hấp dẫn xem miễn phí chất lượng cao.`;

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title: `${collection.name} | Tuyển Tập Phim Nanaflix`,
      description: description.slice(0, 160),
      images: posterImage ? [{ url: posterImage, alt: collection.name }] : [],
      type: "video.movie",
    },
    twitter: {
      card: "summary_large_image",
      title: `${collection.name} | Nanaflix VIP`,
      description: description.slice(0, 160),
      images: posterImage ? [posterImage] : [],
    },
  };
}

export default async function CollectionDetailPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { id } = await params;
  const { u: userId } = await searchParams;

  const collection = await getPublicCollection(id, userId);

  return (
    <div className="page-cinema-container min-h-screen flex flex-col justify-between bg-black text-white">
      <div>
        <Navbar />
        <CollectionClientView
          id={id}
          userId={userId}
          initialData={collection}
        />
      </div>
      <Footer />
    </div>
  );
}

