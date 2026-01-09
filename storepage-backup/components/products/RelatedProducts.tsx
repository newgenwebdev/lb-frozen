'use client'

import React from 'react'
import { ProductCard } from './ProductCard'
import { FadeIn } from '@/components/ui/FadeIn'
import type { Product } from '@/lib/api/adapter'

type RelatedProductsProps = {
  products: Product[]
  title?: string
}

// Skeleton card for loading state
function ProductCardSkeleton(): React.JSX.Element {
  return (
    <div className="animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-square w-full rounded-lg bg-gray-200" />
      {/* Title skeleton */}
      <div className="mt-4 h-4 w-3/4 rounded bg-gray-200" />
      {/* Price skeleton */}
      <div className="mt-2 h-4 w-1/3 rounded bg-gray-200" />
    </div>
  )
}

// Skeleton section for loading state
export function RelatedProductsSkeleton({
  title = 'You might also like',
  count = 4
}: { title?: string; count?: number }): React.JSX.Element {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <h2 className="mb-8 font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black sm:mb-12">
        {title}
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </section>
  )
}

export const RelatedProducts = ({
  products,
  title = 'You might also like'
}: RelatedProductsProps): React.JSX.Element => {
  // Don't render if no products
  if (!products || products.length === 0) {
    return <></>
  }

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <FadeIn>
        <h2 className="mb-8 font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black sm:mb-12">
          {title}
        </h2>
      </FadeIn>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product, index) => (
          <FadeIn key={product.id} delay={index * 0.1}>
            <ProductCard {...product} />
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
