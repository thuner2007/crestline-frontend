import { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const isStaging = host.includes("stage.revsticks.ch");

  // Block all crawlers on staging
  if (isStaging) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    };
  }

  // Allow crawlers on production
  return {
    rules: [
      {
        userAgent: "EtaoSpider",
        disallow: "/",
      },
      {
        userAgent: "Bytespider",
        disallow: "/",
      },
      {
        userAgent: "sogou spider",
        disallow: "/",
      },
      {
        userAgent: "Yandex",
        disallow: "/",
      },
      {
        userAgent: "EventMachine HttpClient",
        disallow: "/",
      },
      {
        userAgent: "niki-bot",
        disallow: "/",
      },
      {
        userAgent: "Pinterestbot",
        crawlDelay: 0.2,
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/*",
          "/api/*",
          "/checkout/*",
          "/account/*",
          "/payment-check/*",
        ],
      },
    ],
    sitemap: [
      "https://revsticks.ch/sitemap.xml",
      "https://revsticks.ch/video-sitemap.xml",
    ],
    host: "https://revsticks.ch",
  };
}
