import { MetadataRoute } from "next";

export default async function manifest({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<MetadataRoute.Manifest> {
  const { locale } = await params;

  // Locale-specific descriptions and names
  const localeData: Record<
    string,
    { name: string; shortName: string; description: string }
  > = {
    en: {
      name: "RevSticks.ch",
      shortName: "RevSticks",
      description:
        "RevSticks.ch - Custom stickers and supermoto parts from Switzerland",
    },
    de: {
      name: "RevSticks.ch",
      shortName: "RevSticks",
      description:
        "RevSticks.ch - Individuelle Sticker und Supermoto-Teile aus der Schweiz",
    },
    fr: {
      name: "RevSticks.ch",
      shortName: "RevSticks",
      description:
        "RevSticks.ch - Autocollants personnalisés et pièces supermoto de Suisse",
    },
    it: {
      name: "RevSticks.ch",
      shortName: "RevSticks",
      description:
        "RevSticks.ch - Adesivi personalizzati e parti supermoto dalla Svizzera",
    },
  };

  const data = localeData[locale] || localeData.en;

  return {
    name: data.name,
    short_name: data.shortName,
    description: data.description,
    start_url: `/${locale}`,
    display: "standalone",
    theme_color: "#000000",
    background_color: "#ffffff",
    orientation: "portrait-primary",
    categories: ["shopping", "customization"],
    lang: locale,
    icons: [
      {
        src: "/favicon.ico",
        type: "image/x-icon",
        sizes: "192x192",
      },
      {
        src: "/192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name:
          locale === "de"
            ? "Sticker kaufen"
            : locale === "fr"
            ? "Acheter autocollants"
            : locale === "it"
            ? "Acquista adesivi"
            : "Shop Stickers",
        short_name:
          locale === "de"
            ? "Shop"
            : locale === "fr"
            ? "Boutique"
            : locale === "it"
            ? "Negozio"
            : "Shop",
        description:
          locale === "de"
            ? "Sticker durchsuchen und anpassen"
            : locale === "fr"
            ? "Parcourir et personnaliser les autocollants"
            : locale === "it"
            ? "Sfoglia e personalizza gli adesivi"
            : "Browse and customize stickers",
        url: `/${locale}/stickers`,
        icons: [{ src: "/192x192.png", sizes: "192x192" }],
      },
      {
        name:
          locale === "de"
            ? "Design Editor"
            : locale === "fr"
            ? "Éditeur de design"
            : locale === "it"
            ? "Editor di design"
            : "Design Editor",
        short_name: "Design",
        description:
          locale === "de"
            ? "Eigene Designs erstellen"
            : locale === "fr"
            ? "Créer des designs personnalisés"
            : locale === "it"
            ? "Crea design personalizzati"
            : "Create custom designs",
        url: `/${locale}/editor`,
        icons: [{ src: "/192x192.png", sizes: "192x192" }],
      },
    ],
    prefer_related_applications: false,
  };
}
