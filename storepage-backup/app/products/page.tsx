import { ProductsFilter } from '@/components/products/ProductsFilter'
import { getProducts, getCategories } from '@/lib/api/medusa'
import { medusaProductsToProducts, type Product } from '@/lib/api/adapter'
import type { MedusaProductCategory } from '@/lib/api/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type ProductsPageProps = {
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function Products({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  // Parse initial selected categories from URL (for SSR)
  const initialSelectedCategories = params.category ? params.category.split(',').filter(Boolean) : []

  // Fetch ALL products and categories (filtering happens client-side for instant UX)
  let products: Product[] = []
  let categories: MedusaProductCategory[] = []

  try {
    const [medusaProducts, fetchedCategories] = await Promise.all([
      getProducts(), // Fetch all products without filter
      getCategories(),
    ])

    products = medusaProductsToProducts(medusaProducts)
    categories = fetchedCategories
  } catch {
    // Return empty arrays if fetch fails
  }

  return (
    <div className="min-h-screen bg-white pt-[73px] sm:pt-[81px] lg:pt-[91px]">
      <ProductsFilter
        products={products}
        categories={categories}
        initialSelectedCategories={initialSelectedCategories}
      />
    </div>
  )
}
