"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function FeatureHighlights() {
  const t = useTranslations("parts");

  const features = [
    {
      title: t("qualityParts"),
      description: t("qualityDesc"),
      icon: "🏆",
    },
    {
      title: t("fastDelivery"),
      description: t("deliveryDesc"),
      icon: "⚡",
    },
    {
      title: t("expertSupport"),
      description: t("supportDesc"),
      icon: "🛠️",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 order-2 md:order-1">
      {features.map((feature, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-xl transition-shadow duration-300"
        >
          <div className="text-3xl mb-4">{feature.icon}</div>
          <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
          <p className="text-gray-600">{feature.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
