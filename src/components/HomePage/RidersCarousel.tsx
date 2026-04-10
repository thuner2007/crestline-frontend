"use client";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface RidersCarouselProps {
  locale: string;
}

export default function RidersCarousel({ locale }: RidersCarouselProps) {
  const t = useTranslations("homepage");

  return (
    <section className="bg-gray-50 py-16 overflow-hidden" aria-labelledby="riders-heading">
      <div className="max-w-sm sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            id="riders-heading"
            className="text-3xl font-extrabold text-gray-900 sm:text-4xl"
          >
            {t("ridersTitle") || "Our Community Riders"}
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            {t("ridersSubtitle") ||
              "Meet the passionate riders who trust RevSticks for their adventures"}
          </p>
        </div>

        {/* View All Riders CTA */}
        <div className="text-center mt-12">
          <Link
            href={`/${locale}/riders`}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-700 hover:bg-purple-800 transition-colors duration-300 shadow-lg hover:shadow-xl"
          >
            {t("viewAllRiders") || "View All Riders"}
            <svg
              className="ml-2 -mr-1 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
