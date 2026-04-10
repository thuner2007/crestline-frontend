"use client";

import { useTranslations } from "next-intl";
import { Mail, MessageCircle, Instagram } from "lucide-react";

export default function ContactPage() {
  const t = useTranslations("contact");

  return (
    <div className="w-full min-h-screen p-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-4xl font-bold text-center mb-4">{t("title")}</h1>
        <p className="text-center text-gray-600 mb-12">{t("description")}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Email Section */}
          <div className="flex flex-col items-center p-6 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow">
            <Mail className="w-12 h-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("email")}</h2>
            <a
              href="mailto:info@revsticks.ch"
              className="text-blue-600 hover:text-blue-800 transition-colors text-center break-all"
            >
              info@revsticks.ch
            </a>
          </div>

          {/* WhatsApp Section */}
          <div className="flex flex-col items-center p-6 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow">
            <MessageCircle className="w-12 h-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-4">{t("whatsapp")}</h2>
            <a
              href="https://wa.me/41795014987"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success w-full text-center"
            >
              {t("chat")}
            </a>
          </div>

          {/* Instagram Section */}
          <div className="flex flex-col items-center p-6 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow">
            <Instagram className="w-12 h-12 text-pink-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("instagram")}</h2>
            <a
              href="https://instagram.com/rev.sticks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 hover:text-pink-800 transition-colors"
            >
              @rev.sticks
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
