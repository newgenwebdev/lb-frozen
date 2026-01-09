'use client'

import React, { useState } from 'react'
import Image from 'next/image'

type ProductGalleryProps = {
  images: Array<{ id: string; url: string }>
  productName: string
}

// Check if URL is external (not local)
const isExternalUrl = (url: string): boolean => url.startsWith('http')

export const ProductGallery = ({ images, productName }: ProductGalleryProps): React.JSX.Element => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})

  if (images.length === 0) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        <div className="flex h-full items-center justify-center text-gray-400">
          No image available
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Main Image */}
      <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        <Image
          src={images[selectedImageIndex].url}
          alt={`${productName} - Image ${selectedImageIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority={selectedImageIndex === 0}
          unoptimized={isExternalUrl(images[selectedImageIndex].url) || imageErrors[selectedImageIndex]}
          onError={() => setImageErrors((prev) => ({ ...prev, [selectedImageIndex]: true }))}
        />
      </div>

      {/* Thumbnail Grid */}
      {images.length > 1 && (
        <div className="overflow-x-auto py-2 pl-1">
          <div className="flex gap-3">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setSelectedImageIndex(index)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 transition-opacity ${
                  selectedImageIndex === index ? 'ring-2 ring-black' : 'opacity-60 hover:opacity-100'
                }`}
                aria-label={`View image ${index + 1}`}
              >
                <Image
                  src={image.url}
                  alt={`${productName} thumbnail ${index + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized={isExternalUrl(image.url) || imageErrors[index]}
                  onError={() => setImageErrors((prev) => ({ ...prev, [index]: true }))}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
