import { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const nextConfig: NextConfig = {
  // Expose version to client
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION || "dev",
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    domains: ["minio-api.cwx-dev.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.fbcdn.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "instagram.*.fbcdn.net",
        port: "",
        pathname: "/**",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
    qualities: [50, 65, 75, 80, 90, 95, 100],
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      "@stripe/stripe-js",
      "framer-motion",
      "lucide-react",
      "next-intl",
      "@fingerprintjs/fingerprintjs",
      "@paypal/react-paypal-js",
    ],
    scrollRestoration: true,
    optimizeCss: true,
    optimizeServerReact: true,
  },

  // Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // React optimizations
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  trailingSlash: false,

  // Security headers including CSP for media
  // DISABLED: CSP is now handled by nginx - see nginx-corrected.conf
  // Having CSP in both places causes conflicts with Stripe
  async headers() {
    return [
      // CSP disabled - managed by nginx
      // {
      //   source: "/:path*",
      //   headers: [
      //     {
      //       key: "Content-Security-Policy",
      //       value:
      //         "default-src 'self'; " +
      //         "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://js.pusher.com https://js.stripe.com; " +
      //         "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      //         "img-src 'self' data: https: blob:; " +
      //         "media-src 'self' https://minio-api.cwx-dev.com blob:; " +
      //         "font-src 'self' data: https://fonts.gstatic.com; " +
      //         "connect-src 'self' https: wss:; " +
      //         "frame-src 'self' https://js.stripe.com https://js.paypal.com; " +
      //         "object-src 'none'; " +
      //         "base-uri 'self'; " +
      //         "form-action 'self'",
      //     },
      //   ],
      // },
    ];
  },

  // Custom webpack not required; relying on Next's built-in CSS optimization

  // Redirects
  async redirects() {
    return [
      {
        source: "/sticker",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:locale/sticker",
        destination: "/:locale",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
