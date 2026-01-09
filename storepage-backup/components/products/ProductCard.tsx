import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/api/adapter'

type ProductCardProps = Product

export const ProductCard = ({
  id,
  name,
  price,
  originalPrice,
  image,
  badge,
  discount,
  inStock = true
}: ProductCardProps): React.JSX.Element => {
  return (
    <Link href={`/products/${id}`} className="group block">
      <div className="relative mb-4 aspect-square overflow-hidden rounded-lg bg-gray-300">
        <Image
          src={image}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className={`object-cover ${!inStock ? 'opacity-50' : ''}`}
        />
        {/* Sold Out Overlay */}
        {!inStock && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="flex -rotate-12 items-center justify-center rounded border-4 border-[#E01715] bg-[#E01715] px-6 py-3 shadow-lg">
              <span className="font-inter text-[20px] font-bold uppercase tracking-wider text-white sm:text-[24px]">
                Sold Out
              </span>
            </div>
          </div>
        )}
        {badge && inStock && (
          <span
            className="absolute right-4 top-4 z-10 rounded-3xl bg-[#E01715] px-4 py-2 text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white"
          >
            {badge}
          </span>
        )}
        {discount && inStock && (
          <span className="absolute right-4 top-4 z-10 rounded-3xl bg-[#E01715] px-4 py-2 text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white">
            {discount}
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
          {name}
        </h3>
        <div className="flex items-baseline gap-2">
          {originalPrice && (
            <span className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999] line-through">
              ${originalPrice.toFixed(2)}
            </span>
          )}
          <span className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
            ${price.toFixed(2)}
          </span>
        </div>
      </div>
    </Link>
  )
}
