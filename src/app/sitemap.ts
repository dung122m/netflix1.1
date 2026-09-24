import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nanaflix.vercel.app";

  const routes = [
    "",
    "/browse",
    "/browse?type=phim-bo",
    "/browse?type=phim-le",
    "/browse?type=phim-chieu-rap",
    "/browse?type=hoat-hinh",
    "/browse?type=tv-shows",
    "/browse?type=phim-thuyet-minh",
    "/browse?type=phim-long-tieng",
    "/live",
  ].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  return routes;
}
