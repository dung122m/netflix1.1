import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = "https://nanaflix.asia";

  const routes = [
    "",
    "/live",
    "/collection",
    "/about",
    "/privacy",
    "/terms",
    "/faq",
  ].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: (["", "/live"].includes(route) ? "daily" : "weekly") as "daily" | "weekly",
    priority: route === "" ? 1.0 : 0.6,
  }));

  return routes;
}
