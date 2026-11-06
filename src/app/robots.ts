import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://nanaflix.asia";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      {
        // Chặn các bot cào dữ liệu hung hãn tiêu thụ tài nguyên và Redis commands không đem lại traffic
        userAgent: ["Bytespider", "PetalBot"],
        disallow: ["/"],
      },
      {
        userAgent: ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "Amazonbot", "ClaudeBot", "GPTBot"],
        crawlDelay: 10,
        disallow: ["/admin/", "/api/", "/dien-vien/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
