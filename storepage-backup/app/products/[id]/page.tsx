import React from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ProductDetail } from '@/components/products/ProductDetail'
import { RelatedProducts } from '@/components/products/RelatedProducts'
import { getProductById, getProductByHandle, getProducts } from '@/lib/api/medusa'
import { medusaProductsToProducts } from '@/lib/api/adapter'
import type { MedusaProduct } from '@/lib/api/types'
import type { Product } from '@/lib/api/adapter'

type ProductPageProps = {
  params: Promise<{ id: string }>
}

/**
 * Fetch product by ID or handle
 * Tries ID first, then falls back to handle lookup
 */
async function getProduct(idOrHandle: string): Promise<MedusaProduct | null> {
  // Try by ID first (Medusa IDs start with "prod_")
  if (idOrHandle.startsWith('prod_')) {
    const product = await getProductById(idOrHandle)
    if (product) return product
  }

  // Try by handle
  return getProductByHandle(idOrHandle)
}

/**
 * Fetch related products from the same category
 */
async function getRelatedProducts(product: MedusaProduct, limit: number = 4): Promise<Product[]> {
  // Get category IDs from current product
  const categoryIds = product.categories?.map(c => c.id) || []

  if (categoryIds.length === 0) {
    // No categories, fetch random products
    const allProducts = await getProducts()
    const filtered = allProducts.filter(p => p.id !== product.id).slice(0, limit)
    return medusaProductsToProducts(filtered)
  }

  // Fetch products from the same categories
  const allProducts = await getProducts({ category_id: categoryIds })

  // Filter out current product and limit results
  const related = allProducts.filter(p => p.id !== product.id).slice(0, limit)

  // If not enough related products, fill with other products
  if (related.length < limit) {
    const otherProducts = await getProducts()
    const additional = otherProducts
      .filter(p => p.id !== product.id && !related.some(r => r.id === p.id))
      .slice(0, limit - related.length)
    related.push(...additional)
  }

  return medusaProductsToProducts(related)
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    return {
      title: 'Product Not Found - KingJess',
    }
  }

  return {
    title: `${product.title} - KingJess`,
    description: product.description || `Shop ${product.title} at KingJess`,
    openGraph: {
      title: product.title,
      description: product.description || undefined,
      images: product.thumbnail ? [product.thumbnail] : undefined,
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps): Promise<React.JSX.Element> {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    notFound()
  }

  // Fetch related products
  const relatedProducts = await getRelatedProducts(product)

  return (
    <main className="min-h-screen bg-white">
      <ProductDetail product={product} />
      <RelatedProducts products={relatedProducts} />
    </main>
  )
}
