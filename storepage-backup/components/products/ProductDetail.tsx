'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ProductGallery } from './ProductGallery'
import { ProductInfo } from './ProductInfo'
import { FadeIn } from '@/components/ui/FadeIn'
import { useCart } from '@/lib/context/CartContext'
import { getBrandById } from '@/lib/api/medusa'
import type { MedusaProduct, MedusaProductVariant, StoreBrand } from '@/lib/api/types'

type ProductDetailProps = {
  product: MedusaProduct
}

export const ProductDetail = ({ product }: ProductDetailProps): React.JSX.Element => {
  const { addToCart, items } = useCart()
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false)
  const [addToCartError, setAddToCartError] = useState<string | null>(null)
  const [brand, setBrand] = useState<StoreBrand | null>(null)

  // Fetch brand if product has brand_id in metadata
  useEffect(() => {
    const fetchBrand = async (): Promise<void> => {
      const brandId = product.metadata?.brand_id
      if (brandId) {
        const fetchedBrand = await getBrandById(brandId)
        setBrand(fetchedBrand)
      }
    }
    fetchBrand()
  }, [product.metadata?.brand_id])

  // Get the total quantity of all variants of this product currently in cart
  const cartQuantityByVariant = useMemo(() => {
    const quantityMap: Record<string, number> = {}
    if (items && product.variants) {
      const productVariantIds = new Set(product.variants.map(v => v.id))
      items.forEach(item => {
        if (item.variant_id && productVariantIds.has(item.variant_id)) {
          quantityMap[item.variant_id] = (quantityMap[item.variant_id] || 0) + item.quantity
        }
      })
    }
    return quantityMap
  }, [items, product.variants])

  // Get total quantity across all variants (for single-variant products)
  const totalCartQuantity = useMemo(() => {
    return Object.values(cartQuantityByVariant).reduce((sum, qty) => sum + qty, 0)
  }, [cartQuantityByVariant])

  // Get base price from variant
  // Priority: prices array base price (no min_quantity) > calculated_price > first price
  // This ensures we show the base price, not wholesale tier prices
  const getVariantPrice = (variant: MedusaProductVariant | undefined): number => {
    if (!variant) return 0

    // First, check prices array for base price (no min_quantity or min_quantity <= 1)
    if (variant.prices && variant.prices.length > 0) {
      const basePrice = variant.prices.find(
        (p) => !p.min_quantity || p.min_quantity <= 1
      )
      if (basePrice) return basePrice.amount / 100
    }

    // Fallback to calculated_price (region-specific) when no explicit base price
    if (variant.calculated_price?.calculated_amount) {
      return variant.calculated_price.calculated_amount / 100
    }

    // Last resort: use first price from array
    if (variant.prices && variant.prices.length > 0) {
      return variant.prices[0].amount / 100
    }

    return 0
  }

  const handleAddToCart = async (variantId: string, quantity: number): Promise<void> => {
    // Show immediate feedback
    setIsAddingToCart(true)
    setAddToCartError(null)

    // Show "adding" toast immediately
    const toastId = toast.loading('Adding to bag...', {
      description: `${quantity} × ${product.title}`,
    })

    try {
      // Call the async addToCart with variant ID and quantity
      await addToCart(variantId, quantity)

      // Update toast to success
      toast.success('Added to bag', {
        id: toastId,
        description: `${quantity} × ${product.title} added to your bag.`,
        action: {
          label: 'View bag',
          onClick: () => window.location.href = '/bag',
        },
      })
    } catch (err) {
      console.error('Failed to add to cart:', err)

      // Parse error message for better user feedback
      const errorMessage = err instanceof Error ? err.message : String(err)
      let userFriendlyError = 'Failed to add item to cart. Please try again.'
      let toastDescription = 'Please try again.'

      // Check for inventory-related errors
      if (errorMessage.toLowerCase().includes('inventory') ||
          errorMessage.toLowerCase().includes('stock') ||
          errorMessage.toLowerCase().includes('quantity')) {
        userFriendlyError = 'Not enough stock available. Please reduce the quantity.'
        toastDescription = 'Insufficient stock for the requested quantity.'
      } else if (errorMessage.toLowerCase().includes('variant')) {
        userFriendlyError = 'This product variant is currently unavailable.'
        toastDescription = 'Product variant unavailable.'
      }

      setAddToCartError(userFriendlyError)
      // Update toast to error
      toast.error('Failed to add to cart', {
        id: toastId,
        description: toastDescription,
      })
      // Re-throw so child component can detect failure and not reset quantity
      throw err
    } finally {
      setIsAddingToCart(false)
    }
  }

  // Prepare images for gallery
  const galleryImages = product.images && product.images.length > 0
    ? product.images
    : product.thumbnail
    ? [{ id: 'thumbnail', url: product.thumbnail }]
    : []

  const price = product.variants && product.variants.length > 0
    ? getVariantPrice(product.variants[0])
    : 0

  // Get category name
  const categoryName = product.categories && product.categories.length > 0
    ? product.categories[0].name
    : undefined

  return (
    <div className="w-full">
      {/* Breadcrumb */}
      <FadeIn direction="none" duration={0.4}>
        <nav className="border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
          <ol className="flex items-center gap-2 text-[14px] font-medium leading-[100%] tracking-[-0.84px]">
            <li>
              <Link href="/" className="text-[#999] transition-colors hover:text-black">
                Home
              </Link>
            </li>
            <li className="text-[#999]">/</li>
            <li>
              <Link href="/products" className="text-[#999] transition-colors hover:text-black">
                Shop
              </Link>
            </li>
            {categoryName && (
              <>
                <li className="text-[#999]">/</li>
                <li className="text-black">{categoryName}</li>
              </>
            )}
          </ol>
        </nav>
      </FadeIn>

      {/* Product Details */}
      <div className="overflow-hidden px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Product Gallery */}
          <FadeIn direction="left" className="w-full">
            <ProductGallery images={galleryImages} productName={product.title} />
          </FadeIn>

          {/* Product Info */}
          <FadeIn direction="right" delay={0.15} className="w-full">
            <ProductInfo
              title={product.title}
              price={price}
              description={product.description}
              category={categoryName}
              brand={brand}
              variants={product.variants}
              options={product.options}
              onAddToCart={handleAddToCart}
              isAddingToCart={isAddingToCart}
              addToCartError={addToCartError}
              cartQuantity={totalCartQuantity}
            />
          </FadeIn>
        </div>
      </div>
    </div>
  )
}
