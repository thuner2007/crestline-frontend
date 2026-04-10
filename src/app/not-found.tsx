import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

export default function NotFound() {
  const t = useTranslations("notFound");
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <div className="text-9xl font-bold text-purple-600">404</div>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-4">{t("title")}</h1>

        <p className="text-gray-600 mb-8">{t("description")}</p>

        <Link
          href={`/${locale}/`}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-700 hover:bg-purple-800 transition-colors"
        >
          {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}
