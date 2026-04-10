"use client";

import React from "react";
import Image from "next/image";

interface LeftiImageLayoutProps {
  images: string[];
}

const LeftiImageLayout: React.FC<LeftiImageLayoutProps> = ({ images }) => {
  if (images.length === 0) return null;

  const [mainImage, ...additionalImages] = images;

  return (
    <div className="space-y-8">
      {/* Main large image - much bigger and without frame */}
      <div className="aspect-[4/3] relative w-full min-h-[500px] lg:min-h-[600px]">
        <Image
          src={mainImage}
          alt="Main product image"
          fill
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-contain"
          unoptimized={true}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/512x512.png";
          }}
        />
      </div>

      {/* Additional images in rows of 2 - static, non-clickable, much bigger */}
      {additionalImages.length > 0 && (
        <div className="grid grid-cols-2 gap-6 lg:gap-8">
          {additionalImages.map((image, index) => (
            <div
              key={index}
              className="aspect-square relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm min-h-[200px] lg:min-h-[300px]"
            >
              <Image
                src={image}
                alt={`Product image ${index + 2}`}
                fill
                sizes="(max-width: 768px) 50vw, 30vw"
                className="object-contain p-2"
                unoptimized={true}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/512x512.png";
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeftiImageLayout;
