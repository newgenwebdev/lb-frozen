"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn, X, Heart, Share2 } from "lucide-react";

interface ProductImage {
  id: string;
  url: string;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  thumbnail?: string;
  productTitle: string;
  discount?: number;
  isInWishlist?: boolean;
  onWishlistClick?: () => void;
  onShareClick?: () => void;
}

export function ProductImageGallery({
  images,
  thumbnail,
  productTitle,
  discount = 0,
  isInWishlist = false,
  onWishlistClick,
  onShareClick,
}: ProductImageGalleryProps) {
  // Build gallery images list - use images array, fallback to thumbnail
  const galleryImages = images.length > 0 
    ? images.map(img => img.url) 
    : thumbnail 
      ? [thumbnail] 
      : ["/placeholder-product.png"];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const goToPrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isZoomed) {
        if (e.key === "Escape") setIsZoomed(false);
        if (e.key === "ArrowLeft") goToPrevious();
        if (e.key === "ArrowRight") goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZoomed]);

  // Touch/swipe handling for mobile
  const touchStartX = useRef<number | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
    
    touchStartX.current = null;
  };

  return (
    <>
      <div className="space-y-3">
        {/* Main Image */}
        <div 
          className="relative bg-gray-50 rounded-2xl lg:rounded-3xl aspect-square flex items-center justify-center p-6 lg:p-12 overflow-hidden group"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Discount Badge */}
          {discount > 0 && (
            <span className="absolute top-2 left-2 lg:top-4 lg:left-4 bg-[#C52129] text-white text-xs font-medium px-2 py-1 rounded z-10">
              {discount}% OFF
            </span>
          )}

          {/* Top Right Action Buttons */}
          <div className="absolute top-2 right-2 lg:top-4 lg:right-4 flex gap-2 z-10">
            {/* Share Button */}
            <button
              onClick={onShareClick}
              className="w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 shadow-sm"
              aria-label="Share product"
            >
              <Share2 className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
            </button>
            {/* Wishlist Button */}
            <button
              onClick={onWishlistClick}
              className="w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 shadow-sm"
              aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart 
                className={`w-4 h-4 lg:w-5 lg:h-5 ${isInWishlist ? "fill-red-500 text-red-500" : "text-gray-400"}`} 
              />
            </button>
          </div>

          {/* Navigation Arrows - Only show if multiple images */}
          {galleryImages.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 w-8 h-8 lg:w-10 lg:h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 w-8 h-8 lg:w-10 lg:h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </>
          )}

          {/* Zoom Button */}
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute bottom-2 right-2 lg:bottom-4 lg:right-4 w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 shadow-sm z-10"
            aria-label="Zoom image"
          >
            <ZoomIn className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
          </button>

          {/* Main Image */}
          <Image
            src={galleryImages[activeIndex]}
            alt={`${productTitle} - Image ${activeIndex + 1}`}
            width={500}
            height={500}
            className="object-contain max-h-full cursor-pointer transition-transform duration-200"
            onClick={() => setIsZoomed(true)}
            priority={activeIndex === 0}
          />

          {/* Dot Navigation - Only show if multiple images */}
          {galleryImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {galleryImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeIndex
                      ? "bg-[#23429B] w-4"
                      : "bg-gray-400 hover:bg-gray-600"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox/Zoom Modal */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setIsZoomed(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation Arrows */}
          {galleryImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Zoomed Image */}
          <div 
            className="relative w-full h-full max-w-4xl max-h-[80vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={galleryImages[activeIndex]}
              alt={`${productTitle} - Image ${activeIndex + 1}`}
              fill
              className="object-contain"
            />
          </div>

          {/* Dot Navigation at Bottom */}
          {galleryImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {galleryImages.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => { e.stopPropagation(); setActiveIndex(index); }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === activeIndex
                      ? "bg-white w-5"
                      : "bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default ProductImageGallery;
