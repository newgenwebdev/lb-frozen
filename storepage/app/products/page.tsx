"use client";

import { Suspense } from "react";
import { SearchResultsContent } from "@/components/shared/SearchResultsContent";

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-6 py-8">
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
