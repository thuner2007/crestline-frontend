import { NextResponse } from "next/server";

interface Part {
  id: string;
  updatedAt: string | null;
  createdAt: string;
  active: boolean;
  videos?: string[];
  images?: string[];
  translations: Array<{
    language: string;
    title: string;
    description: string | null;
  }>;
}

async function fetchPartsWithVideos(): Promise<Part[]> {
  try {
    const response = await fetch(
      `${process.env.BACKEND_URL || "http://localhost:1111"}/parts`,
      {
        next: { revalidate: 3600 }, // Revalidate every hour
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch parts for video sitemap");
      return [];
    }

    const result = await response.json();
    const parts = result.data || result;

    // Filter parts that have videos and are active
    return Array.isArray(parts)
      ? parts.filter(
          (part: Part) => part.active && part.videos && part.videos.length > 0
        )
      : [];
  } catch (error) {
    console.error("Error fetching parts for video sitemap:", error);
    return [];
  }
}

export async function GET() {
  const baseUrl = "https://revsticks.ch";
  const languages = ["en", "de", "fr", "it"];

  const parts = await fetchPartsWithVideos();

  // Build XML for video sitemap
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml +=
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

  parts.forEach((part) => {
    const lastMod = part.updatedAt
      ? new Date(part.updatedAt).toISOString()
      : new Date(part.createdAt).toISOString();

    languages.forEach((lang) => {
      // Get translation for this language
      const translation =
        part.translations.find((t) => t.language === lang) ||
        part.translations.find((t) => t.language === "en");

      const partTitle = translation?.title || part.id;
      const partDescription = translation?.description || "";
      const urlSlug = partTitle.toLowerCase().replace(/\s+/g, "-");

      // Get thumbnail (first image or default)
      const thumbnailUrl = part.images?.[0]
        ? part.images[0].startsWith("http")
          ? part.images[0]
          : `https://minio-api.cwx-dev.com/parts/${part.images[0]}`
        : `${baseUrl}/512x512.png`;

      // Add each video
      part.videos?.forEach((video, index) => {
        const videoUrl = video.startsWith("http")
          ? video
          : `https://minio-api.cwx-dev.com/parts/${video}`;

        const videoCount = part.videos?.length || 0;

        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/${lang}/part/${urlSlug}</loc>\n`;
        xml += `    <lastmod>${lastMod}</lastmod>\n`;
        xml += `    <video:video>\n`;
        xml += `      <video:thumbnail_loc>${thumbnailUrl}</video:thumbnail_loc>\n`;
        xml += `      <video:title>${escapeXml(partTitle)}${
          videoCount > 1 ? ` - Video ${index + 1}` : ""
        }</video:title>\n`;
        xml += `      <video:description>${escapeXml(
          partDescription || `${partTitle} product video`
        )}</video:description>\n`;
        xml += `      <video:content_loc>${videoUrl}</video:content_loc>\n`;
        xml += `      <video:publication_date>${lastMod}</video:publication_date>\n`;
        xml += `    </video:video>\n`;
        xml += `  </url>\n`;
      });
    });
  });

  xml += "</urlset>";

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
