"use client";

import { useParams } from "next/navigation";
import { useProductQuery } from "@/lib/queries";
import { SimilarItems } from "./SimilarItems";

export function SimilarItemsWrapper() {
  const params = useParams();
  const productId = params?.id as string;
  
  // Fetch current product to get its category
  const { data: product, isLoading: loading } = useProductQuery(productId);
  
  // Get first category ID if available
  const categoryId = product?.categories?.[0]?.id;

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="shrink-0 w-50 lg:w-60">
            <div className="bg-white/20 rounded-2xl aspect-square animate-pulse" />
            <div className="mt-3 space-y-2">
              <div className="h-4 bg-white/20 rounded animate-pulse" />
              <div className="h-4 bg-white/20 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <SimilarItems categoryId={categoryId} currentProductId={productId} />
  );
}
