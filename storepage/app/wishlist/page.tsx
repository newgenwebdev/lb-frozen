"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import NewsletterFooter from "@/components/shared/NewsletterFooter";
import { useWishlist, WishlistItem } from "@/lib/WishlistContext";
import { useCartContext } from "@/lib/CartContext";
import { useAuthContext } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

export default function WishlistPage() {
  const router = useRouter();
  const { customer } = useAuthContext();
  const { items, loading, removeFromWishlist, clearWishlist } = useWishlist();
  const { addItem } = useCartContext();
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const handleAddToCart = async (item: WishlistItem) => {
    // Check if variant_id exists
    if (!item.variant_id) {
      console.error("Cannot add to cart: no variant_id", item);
      // Remove invalid item from wishlist
      removeFromWishlist(item.product_id);
      return;
    }
    
    try {
      setAddingToCart(item.product_id);
      await addItem(item.variant_id, 1);
      // Optionally remove from wishlist after adding to cart
      // removeFromWishlist(item.product_id);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setAddingToCart(null);
    }
  };

  const handleRemove = (productId: string) => {
    removeFromWishlist(productId);
  };

  // Show empty state when no items and not loading
  if (items.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-white">
        <ProtectedNavbar />
        <div className=" mx-auto px-4 py-16 text-center">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Your wishlist is empty
          </h1>
          <p className="text-gray-600 mb-6">
            Start adding your favorite items to keep track of them.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-[#23429B] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#1a3178] transition-colors"
          >
            Browse Products
          </Link>
        </div>
        <NewsletterFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ProtectedNavbar />

      <div className="mx-auto px-4 py-8">
        {/* Back button and title */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                My Wishlist
              </h1>
              <p className="text-gray-600">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <button
              onClick={clearWishlist}
              className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          )}
        </div>

        {loading ? (
          // Loading skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse"
              >
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-3 w-1/2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start adding items you love by clicking the heart icon on any
              product.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-[#23429B] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#1a3178] transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          // Wishlist items grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => {
              const discount =
                item.original_price && item.original_price > item.price
                  ? Math.round(
                      ((item.original_price - item.price) /
                        item.original_price) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group"
                >
                  {/* Product Image */}
                  <Link
                    href={`/product/${item.handle}`}
                    className="block relative"
                  >
                    <div className="relative aspect-square bg-gray-50">
                      {discount > 0 && (
                        <div className="absolute top-3 left-3 bg-[#C52129] text-white text-xs font-semibold px-3 py-1 rounded-full z-10">
                          {discount}% OFF
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemove(item.product_id);
                        }}
                        className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>

                      {/* Filled heart to show it's in wishlist */}
                      <div className="absolute bottom-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm z-10">
                        <Heart className="w-5 h-5 text-red-500 fill-current" />
                      </div>

                      {item.thumbnail ? (
                        <Image
                          src={item.thumbnail}
                          alt={item.title}
                          fill
                          className="object-contain p-4"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="p-4">
                    <Link href={`/product/${item.handle}`}>
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-[#23429B] transition-colors">
                        {item.title}
                      </h3>
                    </Link>

                    {item.variant_title && item.variant_title !== "Default" && (
                      <p className="text-sm text-gray-500 mb-2">
                        {item.variant_title}
                      </p>
                    )}

                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-xl font-bold text-gray-900">
                        RM{(item.price / 100).toFixed(2)}
                      </span>
                      {item.original_price &&
                        item.original_price > item.price && (
                          <span className="text-sm text-gray-400 line-through">
                            RM{(item.original_price / 100).toFixed(2)}
                          </span>
                        )}
                    </div>

                    {/* Add to Cart button */}
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={addingToCart === item.product_id}
                      className="w-full flex items-center justify-center gap-2 text-white py-2.5 rounded-full font-medium hover:bg-[#1a3178] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background:
                          "linear-gradient(to right, #23429B, #C52129)",
                      }}
                    >
                      {addingToCart === item.product_id ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Continue Shopping */}
        {items.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-[#23429B] font-medium hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </Link>
          </div>
        )}
      </div>

      <NewsletterFooter />
    </div>
  );
}
