"use client";

import { Suspense } from "react";
import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import { SearchResultsContent } from "@/components/shared/SearchResultsContent";

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <ProtectedNavbar />
        <div className="container mx-auto px-6 py-8">
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
