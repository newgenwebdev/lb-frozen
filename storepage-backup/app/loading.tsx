export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section Skeleton */}
      <section className="relative h-screen">
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
        <div className="relative flex h-full items-end px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
          <div className="max-w-3xl">
            <div className="mb-3 h-4 w-64 animate-pulse rounded bg-gray-300" />
            <div className="mb-6 space-y-2">
              <div className="h-14 w-96 animate-pulse rounded bg-gray-300" />
              <div className="h-14 w-72 animate-pulse rounded bg-gray-300" />
            </div>
            <div className="h-12 w-32 animate-pulse rounded-full bg-gray-300" />
          </div>
        </div>
      </section>

      {/* Best Sellers Section Skeleton */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mb-8 h-10 w-48 animate-pulse rounded bg-gray-200 sm:mb-12" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col">
              <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-200" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shop by Category Section Skeleton */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mb-8 h-10 w-56 animate-pulse rounded bg-gray-200 sm:mb-12" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-4/5 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </section>

      {/* Featured Products Section Skeleton */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mb-8 h-10 w-56 animate-pulse rounded bg-gray-200 sm:mb-12" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col">
              <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-200" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Product Highlight Section Skeleton */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="aspect-square animate-pulse rounded-2xl bg-gray-200 lg:aspect-5/4 xl:aspect-4/3 2xl:aspect-square" />
          <div className="flex flex-col justify-center px-6 lg:px-12 xl:px-36 2xl:mx-auto 2xl:w-1/2 2xl:px-0">
            <div className="mb-6 h-10 w-full animate-pulse rounded bg-gray-200" />
            <div className="mb-8 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-14 w-48 animate-pulse rounded-full bg-gray-200" />
          </div>
        </div>
      </section>

      {/* From the Journal Section Skeleton */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mb-8 h-10 w-48 animate-pulse rounded bg-gray-200 sm:mb-12" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="mb-4 aspect-square animate-pulse rounded-2xl bg-gray-200" />
              <div className="mb-3 flex gap-2">
                <div className="h-8 w-16 animate-pulse rounded-3xl bg-gray-200" />
                <div className="h-8 w-16 animate-pulse rounded-3xl bg-gray-200" />
              </div>
              <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 h-4 w-20 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </section>

      {/* Product Banner Section Skeleton */}
      <section className="px-4 py-8 sm:px-6 sm:py-12 lg:h-screen lg:px-8 lg:py-10 2xl:py-12">
        <div className="relative h-full animate-pulse overflow-hidden rounded-2xl bg-gray-200">
          <div className="relative aspect-4/3 h-full lg:aspect-auto" />
        </div>
      </section>

      {/* Testimonials Section Skeleton */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mb-12 h-10 w-48 animate-pulse rounded bg-gray-200 sm:mb-16" />
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-16">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200" />
              <div className="mb-8 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 animate-pulse rounded-lg bg-gray-200" />
                <div>
                  <div className="mb-1 h-4 w-24 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section Skeleton */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-6 h-10 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mb-8 h-4 w-96 animate-pulse rounded bg-gray-200" />
          <div className="h-12 w-40 animate-pulse rounded-full bg-gray-200" />
        </div>
      </section>
    </div>
  )
}
