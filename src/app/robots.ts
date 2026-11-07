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
        // Chặn hoàn toàn các AI bot cào dữ liệu huấn luyện và crawler hung hãn không đem lại traffic tìm kiếm
        userAgent: [
          "Bytespider",
          "PetalBot",
          "ClaudeBot",
          "Claude-Web",
          "Claude-SearchBot",
          "Claude-User",
          "anthropic-ai",
          "GPTBot",
          "ChatGPT-User",
          "CCBot",
          "Amazonbot",
          "PerplexityBot",
          "Cohere-ai",
          "Diffbot",
          "Omgilibot",
          "AhrefsBot",
          "SemrushBot",
          "DotBot",
          "MJ12bot",
          "DataForSeoBot",
          "Scrapy",
          "SeekportBot",
          "Baiduspider",
          "YandexBot",
          "Sogou web spider",
        ],
        disallow: ["/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
