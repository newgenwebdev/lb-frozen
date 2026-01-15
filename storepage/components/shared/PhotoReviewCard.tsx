"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useWishlist } from "@/lib/WishlistContext";

export interface PhotoReview {
  id: string;
  rating: number;
  title?: string;
  content?: string;
  customer_name: string;
  customer_avatar?: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  photo_urls: string[];
  product: {
    id: string;
    title: string;
    handle: string;
    thumbnail?: string;
    price: string | null;
    currency: string;
  } | null;
}

interface PhotoReviewCardProps {
  review: PhotoReview;
}

export default function PhotoReviewCard({ review }: PhotoReviewCardProps) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const photos = review.photo_urls || [];
  const hasMultiplePhotos = photos.length > 1;
  const productId = review.product?.id || "";
  const isFavorite = productId ? isInWishlist(productId) : false;

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!review.product) return;
    
    if (isFavorite) {
      removeFromWishlist(productId);
    } else {
      // Note: PhotoReviewCard doesn't have variant data, so we can only toggle favorite off
      // Users need to go to product page to add to wishlist properly
      console.warn("Cannot add to wishlist from PhotoReviewCard - no variant data available");
    }
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  // Render star rating
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating)
            ? "text-yellow-400 fill-current"
            : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
      {/* Photo Section */}
      <div className="relative aspect-square bg-gray-100 group">
        {photos.length > 0 ? (
          <Image
            src={photos[currentPhotoIndex]}
            alt={review.title || "Customer review"}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <span className="text-gray-400">No photo</span>
          </div>
        )}

        {/* Navigation arrows for multiple photos */}
        {hasMultiplePhotos && (
          <>
            <button
              onClick={handlePrevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            {/* Photo indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentPhotoIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentPhotoIndex ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Customer name badge */}
        <div className="absolute top-3 left-3 bg-black/50 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
          @{review.customer_name.toLowerCase().replace(/\s+/g, "_")}
        </div>

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className="absolute top-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
        >
          <Heart
            className={`w-5 h-5 ${
              isFavorite ? "text-red-500 fill-current" : "text-gray-600"
            }`}
          />
        </button>

        {/* Verified badge */}
        {review.is_verified_purchase && (
          <div className="absolute bottom-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
            ✓ Verified Purchase
          </div>
        )}
      </div>

      {/* Review Info */}
      <Link
        href={review.product?.handle ? `/product/${review.product.handle}` : "#"}
        className="block p-4"
      >
        {/* Product title */}
        <h4 className="font-semibold text-gray-900 mb-2 line-clamp-1">
          {review.product?.title || review.title || "Product Review"}
        </h4>

        {/* Star rating */}
        <div className="flex items-center gap-1 mb-3">
          <div className="flex">{renderStars(review.rating)}</div>
          <span className="text-sm text-gray-600">
            {review.rating.toFixed(1)} ({review.helpful_count})
          </span>
        </div>

        {/* Review content preview */}
        {review.content && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            "{review.content}"
          </p>
        )}

        {/* Product thumbnail and price */}
        {review.product && (
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            {review.product.thumbnail && (
              <Image
                src={review.product.thumbnail}
                alt={review.product.title}
                width={48}
                height={48}
                className="object-contain rounded bg-gray-50"
              />
            )}
            <div>
              <span className="text-lg font-bold text-gray-900">
                RM{review.product.price || "0.00"}
              </span>
            </div>
          </div>
        )}
      </Link>
    </div>
  );
}
