// src/components/SEO/OrganizationSchema.tsx
export default function OrganizationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "RevSticks",
          url: "https://revsticks.ch",
          logo: "https://revsticks.ch/512x512.png",
          sameAs: [
            "https://www.facebook.com/profile.php?id=61571343549862",
            "https://instagram.com/rev.sticks",
            "https://www.tiktok.com/@revsticks",
          ],
        }),
      }}
    />
  );
}
