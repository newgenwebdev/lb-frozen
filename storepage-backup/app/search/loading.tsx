export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-white pt-[73px] sm:pt-[81px] lg:pt-[91px]">
      {/* Page Heading Skeleton */}
      <div className="px-4 pb-0 pt-11 sm:px-6 sm:pb-0 sm:pt-14 lg:px-8 lg:pb-0 lg:pt-16">
        <div className="h-10 w-72 animate-pulse rounded bg-gray-200 sm:w-96" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Search Results Skeleton */}
      <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-12">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col">
              {/* Image Skeleton */}
              <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-200" />
              {/* Product Info Skeleton */}
              <div className="mt-4 flex items-baseline justify-between">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
