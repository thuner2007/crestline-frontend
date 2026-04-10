import type { MetadataRoute } from "next";

interface Part {
  id: string;
  updatedAt: string | null;
  createdAt: string;
  active: boolean;
  translations: Array<{
    language: string;
    title: string;
  }>;
}

interface Sticker {
  id: string;
  updatedAt: string | null;
  createdAt: string;
  active: boolean;
}

interface PowdercoatService {
  id: string;
  name: string;
  updatedAt: string | null;
  createdAt: string;
  active: boolean;
}

interface BlogPost {
  id: string;
  title?: string;
  translations: Array<{
    language: string;
    title: string;
  }>;
  updatedAt: string | null;
  createdAt: string;
  active: boolean;
}

async function fetchParts(): Promise<Part[]> {
  try {
    const response = await fetch(
      `${process.env.BACKEND_URL || "http://localhost:1111"}/parts`,
      {
        next: { revalidate: 3600 }, // Revalidate every hour
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch parts for sitemap");
      return [];
    }

    const result = await response.json();
    const parts = result.data || result;
    return Array.isArray(parts)
      ? parts.filter((part: Part) => part.active)
      : [];
  } catch (error) {
    console.error("Error fetching parts for sitemap:", error);
    return [];
  }
}

async function fetchStickers(): Promise<Sticker[]> {
  try {
    const response = await fetch(
      `${
        process.env.BACKEND_URL || "http://localhost:1111"
      }/stickers?amount=1000&start=0`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch stickers for sitemap");
      return [];
    }

    const result = await response.json();
    const stickers = result.data || result;
    return Array.isArray(stickers)
      ? stickers.filter((sticker: Sticker) => sticker.active)
      : [];
  } catch (error) {
    console.error("Error fetching stickers for sitemap:", error);
    return [];
  }
}

async function fetchPowdercoatServices(): Promise<PowdercoatService[]> {
  try {
    const response = await fetch(
      `${
        process.env.BACKEND_URL || "http://localhost:1111"
      }/powdercoatservice?amount=1000&start=0`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch powdercoat services for sitemap");
      return [];
    }

    const result = await response.json();
    const services = result.data || result;
    return Array.isArray(services)
      ? services.filter((service: PowdercoatService) => service.active)
      : [];
  } catch (error) {
    console.error("Error fetching powdercoat services for sitemap:", error);
    return [];
  }
}

async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const response = await fetch(
      `${
        process.env.BACKEND_URL || "http://localhost:1111"
      }/blog?activeOnly=true`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch blog posts for sitemap");
      return [];
    }

    const posts = await response.json();
    return Array.isArray(posts) ? posts : [];
  } catch (error) {
    console.error("Error fetching blog posts for sitemap:", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://revsticks.ch";
  const languages = ["en", "de", "fr", "it"];

  // Define all routes excluding protected/dynamic ones
  const mainRoutes = [
    "", // home
    "/parts",
    "/stickers",
    "/powdercoat",
    "/login",
    "/register",
  ];

  const secondaryRoutes = ["/imprint", "/privacy", "/agb"];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Add main routes with higher priority
  mainRoutes.forEach((route) => {
    // Add each language version
    languages.forEach((lang) => {
      sitemapEntries.push({
        url: `${baseUrl}/${lang}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "daily" : "weekly",
        priority: route === "" ? 1.0 : 0.9,
        alternates: {
          languages: {
            "x-default": `${baseUrl}/en${route}`,
            ...languages.reduce((acc, l) => {
              acc[l] = `${baseUrl}/${l}${route}`;
              return acc;
            }, {} as Record<string, string>),
          },
        },
      });
    });
  });

  // Add secondary routes with lower priority
  secondaryRoutes.forEach((route) => {
    // Add each language version
    languages.forEach((lang) => {
      sitemapEntries.push({
        url: `${baseUrl}/${lang}${route}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
        alternates: {
          languages: {
            "x-default": `${baseUrl}/en${route}`,
            ...languages.reduce((acc, l) => {
              acc[l] = `${baseUrl}/${l}${route}`;
              return acc;
            }, {} as Record<string, string>),
          },
        },
      });
    });
  });

  // Fetch and add dynamic part pages
  const parts = await fetchParts();
  parts.forEach((part) => {
    const lastMod = part.updatedAt
      ? new Date(part.updatedAt)
      : new Date(part.createdAt);

    languages.forEach((lang) => {
      // Get the part title for this language
      const translation =
        part.translations.find((t) => t.language === lang) ||
        part.translations.find((t) => t.language === "en");
      const partTitle = translation?.title || part.id;
      const urlSlug = partTitle.toLowerCase().replace(/\s+/g, "-");

      sitemapEntries.push({
        url: `${baseUrl}/${lang}/part/${urlSlug}`,
        lastModified: lastMod,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: {
            "x-default": (() => {
              const enTranslation = part.translations.find(
                (t) => t.language === "en"
              );
              const enTitle = enTranslation?.title || part.id;
              const enSlug = enTitle.toLowerCase().replace(/\s+/g, "-");
              return `${baseUrl}/en/part/${enSlug}`;
            })(),
            ...languages.reduce((acc, l) => {
              const altTranslation =
                part.translations.find((t) => t.language === l) ||
                part.translations.find((t) => t.language === "en");
              const altTitle = altTranslation?.title || part.id;
              const altSlug = altTitle.toLowerCase().replace(/\s+/g, "-");
              acc[l] = `${baseUrl}/${l}/part/${altSlug}`;
              return acc;
            }, {} as Record<string, string>),
          },
        },
      });
    });
  });

  // Fetch and add dynamic sticker pages
  const stickers = await fetchStickers();
  stickers.forEach((sticker) => {
    const lastMod = sticker.updatedAt
      ? new Date(sticker.updatedAt)
      : new Date(sticker.createdAt);

    languages.forEach((lang) => {
      sitemapEntries.push({
        url: `${baseUrl}/${lang}/sticker/${sticker.id}`,
        lastModified: lastMod,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: {
            "x-default": `${baseUrl}/en/sticker/${sticker.id}`,
            ...languages.reduce((acc, l) => {
              acc[l] = `${baseUrl}/${l}/sticker/${sticker.id}`;
              return acc;
            }, {} as Record<string, string>),
          },
        },
      });
    });
  });

  // Fetch and add dynamic powdercoat service pages
  const services = await fetchPowdercoatServices();
  services.forEach((service) => {
    const lastMod = service.updatedAt
      ? new Date(service.updatedAt)
      : new Date(service.createdAt);

    // Create URL slug from service name
    const urlSlug = service.name.toLowerCase().replace(/\s+/g, "-");

    languages.forEach((lang) => {
      sitemapEntries.push({
        url: `${baseUrl}/${lang}/powdercoat/${urlSlug}`,
        lastModified: lastMod,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: {
            "x-default": `${baseUrl}/en/powdercoat/${urlSlug}`,
            ...languages.reduce((acc, l) => {
              acc[l] = `${baseUrl}/${l}/powdercoat/${urlSlug}`;
              return acc;
            }, {} as Record<string, string>),
          },
        },
      });
    });
  });

  // Fetch and add dynamic blog post pages
  const blogPosts = await fetchBlogPosts();
  blogPosts.forEach((post) => {
    const lastMod = post.updatedAt
      ? new Date(post.updatedAt)
      : new Date(post.createdAt);

    // Get title from translations (use first available) or fallback to legacy title
    const postTitle = post.translations?.[0]?.title || post.title || "untitled";
    const urlSlug = postTitle.toLowerCase().replace(/\s+/g, "-");

    languages.forEach((lang) => {
      sitemapEntries.push({
        url: `${baseUrl}/${lang}/blog/${urlSlug}`,
        lastModified: lastMod,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: {
          languages: {
            "x-default": `${baseUrl}/en/blog/${urlSlug}`,
            ...languages.reduce((acc, l) => {
              acc[l] = `${baseUrl}/${l}/blog/${urlSlug}`;
              return acc;
            }, {} as Record<string, string>),
          },
        },
      });
    });
  });

  return sitemapEntries;
}
