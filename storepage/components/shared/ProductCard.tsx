import Image from "next/image";
import { Product } from "@/lib/api/types";

interface ProductCardProps {
  product: Product;
  onAddToCart: (variantId: string) => void;
  onClick: (productId: string) => void;
  showDiscount?: boolean;
}

export default function ProductCard({ product, onAddToCart, onClick, showDiscount = true }: ProductCardProps) {
  const variant = product.variants?.[0];
  const price = variant?.calculated_price?.calculated_amount || 0;
  
  // Calculate original price from metadata discount if available
  let originalPrice = variant?.calculated_price?.original_amount || price;
  const metadataDiscount = variant?.metadata?.discount ? Number(variant.metadata.discount) : 0;
  const discountType = variant?.metadata?.discount_type as string || 'percentage';
  
  if (metadataDiscount > 0 && originalPrice === price) {
    // If API didn't return original_amount but we have metadata discount, calculate it
    if (discountType === 'percentage') {
      originalPrice = Math.round(price / (1 - metadataDiscount / 100));
    } else {
      originalPrice = price + (metadataDiscount * 100); // Convert to cents
    }
  }
  
  const discountPercentage = originalPrice > price 
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
  
  // Get rating and sold count from product metadata
  const rating = product.metadata?.rating ? Number(product.metadata.rating) : null;
  const soldCount = product.metadata?.sold_count ? Number(product.metadata.sold_count) : null;

  return (
    <div className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      <div 
        className="relative"
        onClick={() => onClick(product.id)}
      >
        {showDiscount && discountPercentage > 0 && (
          <div className="absolute top-3 left-3 bg-[#C52129] text-white text-xs font-semibold px-3 py-1 rounded-full z-10">
            {discountPercentage}% OFF
          </div>
        )}
        <button 
          className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 z-10"
          onClick={(e) => {
            e.stopPropagation();
            // Add to wishlist functionality
          }}
        >
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
        <div className="bg-gray-100 aspect-square flex items-center justify-center p-6">
          <Image
            src={product.thumbnail || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E"}
            alt={product.title}
            width={200}
            height={200}
            className="object-contain"
            unoptimized={!product.thumbnail}
          />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">
          {product.title}
        </h3>
        {(rating || soldCount) && (
          <div className="flex items-center gap-1 mb-2">
            {rating && (
              <>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 fill-current ${
                        i < Math.floor(rating) ? '' : 'opacity-30'
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-gray-600">{rating.toFixed(1)}</span>
              </>
            )}
            {soldCount && (
              <span className="text-xs text-gray-500 ml-1">
                ({soldCount.toLocaleString()} sold)
              </span>
            )}
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            RM{(price / 100).toFixed(2)}
          </span>
          {originalPrice > price && (
            <span className="text-sm text-gray-400 line-through">
              RM{(originalPrice / 100).toFixed(2)}
            </span>
          )}
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (variant) {
              onAddToCart(variant.id);
            }
          }}
          className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 rounded-lg font-medium transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
