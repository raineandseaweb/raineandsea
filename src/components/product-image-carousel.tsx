"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  alt: string;
  sort: number;
}

interface ProductImageCarouselProps {
  images: ProductImage[];
  productTitle: string;
  className?: string;
}

export function ProductImageCarousel({
  images,
  productTitle,
  className = "",
}: ProductImageCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const mainImageRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Sort images by sort order (memoized to prevent infinite loops)
  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => a.sort - b.sort);
  }, [images]);

  useEffect(() => {
    // Preload all images
    if (sortedImages.length > 0) {
      setIsLoading(true);
      let loadedCount = 0;
      const totalImages = sortedImages.length;

      const handleImageLoad = (index: number) => {
        loadedCount++;
        setLoadedImages((prev) => new Set([...prev, index]));

        if (loadedCount === totalImages) {
          setIsLoading(false);
        }
      };

      // Preload all images
      sortedImages.forEach((image, index) => {
        const img = new window.Image();
        img.onload = () => handleImageLoad(index);
        img.onerror = () => handleImageLoad(index); // Still count as "loaded" even if failed
        img.src = image.url;
      });

      // Cleanup function to prevent memory leaks
      return () => {
        // No need to clean up individual images as they're handled by browser
      };
    }
  }, [sortedImages]);

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);

    // Scroll thumbnail into view
    thumbnailRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const handlePrevious = () => {
    const newIndex =
      selectedIndex > 0 ? selectedIndex - 1 : sortedImages.length - 1;
    setSelectedIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex =
      selectedIndex < sortedImages.length - 1 ? selectedIndex + 1 : 0;
    setSelectedIndex(newIndex);
  };

  if (sortedImages.length === 0) {
    return (
      <div
        className={`aspect-square bg-gray-100 rounded-lg overflow-hidden ${className}`}
      >
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <svg
            className="w-24 h-24"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {/* Main Image */}
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        <Image
          src={sortedImages[selectedIndex].url}
          alt={sortedImages[selectedIndex].alt || productTitle}
          fill
          className="object-cover"
          priority={selectedIndex === 0}
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Navigation Arrows - Always visible on mobile */}
        {sortedImages.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 sm:p-2 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              aria-label="Previous image"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 sm:p-2 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              aria-label="Next image"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
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
            </button>
          </>
        )}

        {/* Image Counter */}
        {sortedImages.length > 1 && (
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/50 text-white px-2 py-1 rounded text-xs sm:text-sm">
            {selectedIndex + 1} / {sortedImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {sortedImages.length > 1 && (
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-2 scrollbar-hide">
          {sortedImages.map((image, index) => (
            <button
              key={image.id}
              ref={(el) => {
                thumbnailRefs.current[index] = el;
              }}
              onClick={() => handleThumbnailClick(index)}
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden border-2 transition-all ${
                selectedIndex === index
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Image
                src={image.thumbnailUrl || image.url}
                alt={image.alt || `${productTitle} thumbnail ${index + 1}`}
                width={80}
                height={80}
                className="w-full h-full object-cover"
                loading="lazy"
                sizes="(max-width: 640px) 64px, 80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
