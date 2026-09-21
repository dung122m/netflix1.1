import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nanaflix.vercel.app";

  const routes = [
    "",
    "/?type=phim-bo",
    "/?type=phim-le",
    "/?type=phim-chieu-rap",
    "/?type=hoat-hinh",
    "/?type=tv-shows",
    "/?type=phim-thuyet-minh",
    "/?type=phim-long-tieng",
    "/live",
  ].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  return routes;
}
