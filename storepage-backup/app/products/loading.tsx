export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-white pt-[73px] sm:pt-[81px] lg:pt-[91px]">
      {/* Page Heading Skeleton */}
      <div className="px-4 pb-0 pt-11 sm:px-6 sm:pb-0 sm:pt-14 lg:px-8 lg:pb-0 lg:pt-16">
        <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Sidebar and Products */}
      <div className="flex">
        {/* Sidebar Skeleton - Hidden on mobile */}
        <aside className="hidden w-80 px-8 py-12 lg:block">
          {/* Filter Heading */}
          <div className="mb-8 h-6 w-24 animate-pulse rounded bg-gray-200" />

          {/* Category Filter Skeleton */}
          <div className="mb-6">
            <div className="flex w-full items-center justify-between border-b border-gray-200 pb-4">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="mt-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients Filter Skeleton */}
          <div className="mb-6">
            <div className="flex w-full items-center justify-between border-b border-gray-200 pb-4">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="mt-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>

          {/* Price Filter Skeleton */}
          <div className="mb-6">
            <div className="flex w-full items-center justify-between border-b border-gray-200 pb-4">
              <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="mt-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Products Grid Skeleton */}
        <div className="flex-1 bg-white px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div key={i} className="flex flex-col">
                {/* Image Skeleton */}
                <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-200" />
                {/* Product Info Skeleton */}
                <div className="mt-4 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
