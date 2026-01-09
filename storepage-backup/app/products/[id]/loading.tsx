import React from 'react'

function Skeleton({ className = '' }: { className?: string }): React.JSX.Element {
  return <div className={`animate-pulse bg-gray-200 ${className}`} />
}

export default function ProductLoading(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-white">
      <div className="w-full">
        {/* Breadcrumb Skeleton */}
        <nav className="border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12 rounded" />
            <span className="text-[#999]">/</span>
            <Skeleton className="h-4 w-10 rounded" />
            <span className="text-[#999]">/</span>
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </nav>

        {/* Product Details Skeleton */}
        <div className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Product Gallery Skeleton */}
            <div className="w-full">
              <Skeleton className="aspect-square w-full rounded-lg" />
              {/* Thumbnail grid */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                <Skeleton className="aspect-square rounded" />
                <Skeleton className="aspect-square rounded" />
                <Skeleton className="aspect-square rounded" />
                <Skeleton className="aspect-square rounded" />
              </div>
            </div>

            {/* Product Info Skeleton */}
            <div className="w-full space-y-6">
              {/* Category */}
              <Skeleton className="h-4 w-24 rounded" />
              {/* Title */}
              <Skeleton className="h-10 w-3/4 rounded" />
              {/* Price */}
              <Skeleton className="h-8 w-32 rounded" />
              {/* Description */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
              {/* Variant selector */}
              <div className="space-y-3">
                <Skeleton className="h-5 w-16 rounded" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-20 rounded" />
                  <Skeleton className="h-10 w-20 rounded" />
                  <Skeleton className="h-10 w-20 rounded" />
                </div>
              </div>
              {/* Quantity */}
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-32 rounded" />
                <Skeleton className="h-12 flex-1 rounded" />
              </div>
              {/* Accordion sections */}
              <div className="space-y-4 border-t pt-6">
                <Skeleton className="h-12 w-full rounded" />
                <Skeleton className="h-12 w-full rounded" />
                <Skeleton className="h-12 w-full rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section Skeleton */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <Skeleton className="mb-8 h-10 w-64 rounded sm:mb-12" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="mb-4 aspect-square rounded-lg" />
              <div className="flex items-baseline justify-between">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
