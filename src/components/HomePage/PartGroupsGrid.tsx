"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Layers, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import useAxios from "@/useAxios";

interface Translation {
  language: string;
  title: string;
}

interface PartGroup {
  id: string;
  translations: Translation[];
  image?: string;
}

interface PartGroupsGridProps {
  locale: string;
}

export default function PartGroupsGrid({ locale }: PartGroupsGridProps) {
  const router = useRouter();
  const [partGroups, setPartGroups] = useState<PartGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const axiosInstance = useAxios();

  useEffect(() => {
    const fetchPartGroups = async () => {
      try {
        setLoading(true);
        const { data } = await axiosInstance.get<PartGroup[]>(
          "/groups/part-groups",
        );
        setPartGroups(data);
      } catch (error) {
        console.error("Error fetching part groups:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPartGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col h-64 md:h-80 rounded-2xl overflow-hidden border-2 border-gray-200 bg-white animate-pulse"
          >
            <div className="flex-grow bg-gray-200" />
            <div className="px-5 py-4 border-t-2 border-gray-100">
              <div className="h-5 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (partGroups.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {partGroups.map((group, idx) => {
        const groupTranslation =
          group.translations.find((t) => t.language === locale) ||
          group.translations[0];

        return (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
            onClick={() => {
              const groupName = groupTranslation?.title || group.id;
              const urlSlug = groupName.toLowerCase().replace(/\s+/g, "-");
              router.push(`/${locale}/partGroup/${urlSlug}`);
            }}
            className="cursor-pointer group"
          >
            <div className="flex flex-col h-64 md:h-80 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border-2 border-gray-200 hover:border-purple-400 bg-white relative transform hover:scale-105 hover:-rotate-1">
              <div className="relative flex-grow overflow-hidden">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-75 blur-sm transition-opacity duration-500 -z-10 animate-pulse"></div>

                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 z-20 pointer-events-none transition-opacity duration-700">
                  <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-300 rounded-full animate-ping shadow-lg shadow-yellow-300/50"></div>
                  <div className="absolute top-1/3 right-1/3 w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-lg shadow-white/50"></div>
                  <div className="absolute bottom-1/4 right-1/4 w-1.5 h-1.5 bg-purple-300 rounded-full animate-ping shadow-lg shadow-purple-300/50"></div>
                  <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-pink-300 rounded-full animate-bounce"></div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/90 via-purple-600/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>

                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-gray-100"></div>

                {group.image ? (
                  <Image
                    src={
                      group.image.startsWith("http")
                        ? group.image
                        : `https://minio-api.cwx-dev.com/part-groups/${group.image}`
                    }
                    alt={groupTranslation?.title || "Part Group"}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    unoptimized={true}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/512x512.png";
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-8 rounded-full bg-purple-50/80 backdrop-blur-sm">
                      <Layers className="h-16 w-16 text-purple-300" />
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t-2 border-gray-100 bg-white group-hover:bg-gradient-to-r group-hover:from-purple-50 group-hover:to-pink-50 transition-all duration-300">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm md:text-lg font-bold text-gray-900 group-hover:text-purple-700 transition-colors duration-300 line-clamp-2 min-w-0">
                    {groupTranslation?.title || ""}
                  </h3>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-purple-600 group-hover:to-pink-600 group-hover:text-white transition-all duration-300 group-hover:scale-125 group-hover:rotate-90 shadow-md group-hover:shadow-lg group-hover:shadow-purple-500/50">
                    <ChevronRight className="h-5 w-5 text-purple-600 group-hover:text-white transform group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
