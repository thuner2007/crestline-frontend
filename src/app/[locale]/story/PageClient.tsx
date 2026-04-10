"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function StoryPage() {
  const t = useTranslations("story");
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gray-900 py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400 text-sm font-medium tracking-wider uppercase mb-4">
              {t("subtitle")}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              {t("heroTitle")}
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              {t("heroSubtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Story Content */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Introduction */}
          <div className="mb-20">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
              {t("introTitle")}
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              {t("introText")}
            </p>
          </div>

          {/* The Dream */}
          <div className="mb-20">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
              {t("dreamTitle")}
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              {t("dreamText")}
            </p>
          </div>

          {/* Passion Meets Innovation */}
          <div className="mb-20">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
              {t("passionTitle")}
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              {t("passionText")}
            </p>
          </div>

          {/* Swiss Quality */}
          <div className="mb-20 border-l-4 border-gray-900 pl-6 py-2">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
              {t("swissQualityTitle")}
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              {t("swissQualityText")}
            </p>
          </div>

          {/* Community First */}
          <div className="mb-20">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
              {t("communityTitle")}
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              {t("communityText")}
            </p>
          </div>

          {/* The Future */}
          <div className="mb-20">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
              {t("futureTitle")}
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              {t("futureText")}
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gray-50 py-16 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
            {t("ctaTitle")}
          </h2>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            {t("ctaText")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/parts`}
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 transition-colors duration-200 rounded"
            >
              {t("browseParts")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
