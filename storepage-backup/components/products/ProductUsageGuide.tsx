'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { FadeIn } from '@/components/ui/FadeIn'

type ProductUsageGuideProps = {
  title: string
  description: string
  image: string
  imageAlt?: string
}

export const ProductUsageGuide = ({
  title,
  description,
  image,
  imageAlt = 'Product usage demonstration'
}: ProductUsageGuideProps): React.JSX.Element => {
  const [imageError, setImageError] = useState(false)

  // Check if image is external (not local)
  const isExternal = image.startsWith('http')

  return (
    <section className="w-full bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-36">
        {/* Text Content */}
        <FadeIn direction="left">
          <div className="flex flex-col justify-center">
            <h2 className="mb-6 font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black">
              {title}
            </h2>
            <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
              {description}
            </p>
          </div>
        </FadeIn>

        {/* Image */}
        <FadeIn direction="right" delay={0.15}>
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              unoptimized={isExternal || imageError}
              onError={() => setImageError(true)}
            />
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
