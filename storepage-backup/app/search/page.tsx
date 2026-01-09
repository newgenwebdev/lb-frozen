import { ProductCard } from '@/components/products/ProductCard'
import { getProducts } from '@/lib/api/medusa'
import { medusaProductsToProducts, type Product } from '@/lib/api/adapter'
import Link from 'next/link'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q?.trim() || ''

  let products: Product[] = []

  if (query) {
    try {
      const medusaProducts = await getProducts({ q: query })
      products = medusaProductsToProducts(medusaProducts)
    } catch {
      // Return empty array if fetch fails
    }
  }

  return (
    <div className="min-h-screen bg-white pt-[73px] sm:pt-[81px] lg:pt-[91px]">
      {/* Page Heading */}
      <div className="px-4 pb-0 pt-11 sm:px-6 sm:pb-0 sm:pt-14 lg:px-8 lg:pb-0 lg:pt-16">
        <h1 className="text-[40px] font-medium leading-[120%] tracking-[-2.4px] text-black">
          {query ? `Search results for "${query}"` : 'Search'}
        </h1>
        {query && (
          <p className="mt-2 text-[16px] text-[#999]">
            {products.length} {products.length === 1 ? 'product' : 'products'} found
          </p>
        )}
      </div>

      {/* Search Results */}
      <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {!query ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg
              className="mb-4 h-16 w-16 text-[#E3E3E3]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-center text-[16px] text-[#999]">
              Enter a search term to find products
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg
              className="mb-4 h-16 w-16 text-[#E3E3E3]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mb-2 text-center text-[16px] text-black">
              No products found for &quot;{query}&quot;
            </p>
            <p className="mb-6 text-center text-[14px] text-[#999]">
              Try a different search term or browse our products
            </p>
            <Link
              href="/products"
              className="rounded-full bg-black px-8 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-80"
            >
              Browse all products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-12">
            {products.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
