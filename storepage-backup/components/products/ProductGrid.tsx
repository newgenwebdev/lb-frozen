import React from 'react'
import { ProductCard } from './ProductCard'
import type { Product } from '@/lib/api/adapter'

type ProductGridProps = {
  products: Product[]
}

export const ProductGrid = ({ products }: ProductGridProps): React.JSX.Element => {
  return (
    <div className="flex-1 bg-white px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
        {products.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </div>
  )
}
