import { useState, useEffect, TouchEvent } from "react";
import NextImage from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, X } from "lucide-react";

const ImageCarousel = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number>(0);
  const [touchEnd, setTouchEnd] = useState<number>(0);
  const [imageError, setImageError] = useState(false);
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  // Minimum swipe distance in pixels
  const minSwipeDistance = 50;

  // Process images once on component mount
  useEffect(() => {
    if (!images || images.length === 0) return;

    // Process all images to ensure they have proper URLs
    const processed = images.map((img) => {
      if (img.startsWith("http")) {
        return img;
      } else {
        return `https://minio-api.cwx-dev.com/stickers/${img}`;
      }
    });

    setProcessedImages(processed);
  }, [images]);

  useEffect(() => {
    // Reset error state when images or index changes
    setImageError(false);
  }, [processedImages, currentIndex]);

  const onTouchStart = (e: TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextImage();
    }
    if (isRightSwipe) {
      previousImage();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const nextImage = () => {
    if (!processedImages.length) return;
    setCurrentIndex((prev) => (prev + 1) % processedImages.length);
  };

  const previousImage = () => {
    if (!processedImages.length) return;
    setCurrentIndex(
      (prev) => (prev - 1 + processedImages.length) % processedImages.length
    );
  };

  const openModal = (index: number) => {
    setModalImageIndex(index);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const modalPreviousImage = () => {
    if (!processedImages.length) return;
    setModalImageIndex(
      (prev) => (prev - 1 + processedImages.length) % processedImages.length
    );
  };

  const modalNextImage = () => {
    if (!processedImages.length) return;
    setModalImageIndex((prev) => (prev + 1) % processedImages.length);
  };

  // Handle keyboard navigation in modal
  useEffect(() => {
    if (!modalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      } else if (e.key === "ArrowLeft") {
        modalPreviousImage();
      } else if (e.key === "ArrowRight") {
        modalNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, processedImages.length]);

  // Fix: Updated logic to check for valid images
  const hasValidImages = processedImages && processedImages.length > 0;
  const currentImageUrl = hasValidImages ? processedImages[currentIndex] : null;

  return (
    <div className="relative w-full">
      <div
        className="relative aspect-square flex items-center justify-center bg-zinc-900 overflow-hidden touch-pan-y cursor-pointer transition-colors"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => openModal(currentIndex)}
      >
        {currentImageUrl && !imageError ? (
          <NextImage
            src={currentImageUrl || "/512x512.png"}
            alt={`Product image ${currentIndex + 1}`}
            fill
            className="object-contain select-none"
            priority={currentIndex === 0}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/512x512.png";
              setImageError(true);
            }}
            draggable={false}
            unoptimized={true}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <NextImage
              src="/512x512.png"
              alt="No image available"
              fill
              className="object-contain select-none"
              priority
              draggable={false}
              unoptimized={true}
            />
          </div>
        )}

        {hasValidImages && processedImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                previousImage();
              }}
              className="absolute left-2 p-2 bg-zinc-950/70 hover:bg-zinc-950/90 border border-zinc-700 transition-colors sm:p-1 touch-none"
              aria-label="Previous image"
            >
              <ChevronLeftIcon className="h-6 w-6 sm:h-5 sm:w-5 text-zinc-200" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-2 p-2 bg-zinc-950/70 hover:bg-zinc-950/90 border border-zinc-700 transition-colors sm:p-1 touch-none"
              aria-label="Next image"
            >
              <ChevronRightIcon className="h-6 w-6 sm:h-5 sm:w-5 text-zinc-200" />
            </button>

            <div className="absolute bottom-4 sm:bottom-2 left-0 right-0 flex justify-center gap-2">
              {processedImages.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`w-2 h-2 transition-all duration-200 ${
                    index === currentIndex ? "bg-amber-400 w-4" : "bg-zinc-600 hover:bg-zinc-400"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal/Lightbox */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90"
          onClick={closeModal}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="fixed inset-0 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4">
            <button
              onClick={closeModal}
              className="fixed top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors z-50"
              aria-label="Close modal"
            >
              <X className="h-8 w-8 text-white" />
            </button>

            {processedImages[modalImageIndex] && (
              <div
                className="relative flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <NextImage
                  src={processedImages[modalImageIndex]}
                  alt={`Product image ${modalImageIndex + 1}`}
                  width={1200}
                  height={1200}
                  className="object-contain select-none rounded-lg max-h-[90vh] max-w-[90vw] w-auto h-auto"
                  priority
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/512x512.png";
                  }}
                  draggable={false}
                  unoptimized={true}
                />

                {processedImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        modalPreviousImage();
                      }}
                      className="fixed left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-40"
                      aria-label="Previous image"
                    >
                      <ChevronLeftIcon className="h-8 w-8 text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        modalNextImage();
                      }}
                      className="fixed right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-40"
                      aria-label="Next image"
                    >
                      <ChevronRightIcon className="h-8 w-8 text-white" />
                    </button>

                    <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-2 z-40">
                      {processedImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalImageIndex(index);
                          }}
                          className={`w-2 h-2 transition-all duration-200 ${
                            index === modalImageIndex
                              ? "bg-amber-400 w-4"
                              : "bg-white/40 hover:bg-white/60"
                          }`}
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;
