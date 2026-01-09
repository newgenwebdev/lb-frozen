'use client'

import { ProductCard } from '@/components/products/ProductCard'
import { FadeIn } from '@/components/ui/FadeIn'
import type { Product } from '@/lib/api/adapter'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

interface HomeContentProps {
  bestSellersToShow: Product[]
  featuredToShow: Product[]
}

export function HomeContent({ bestSellersToShow, featuredToShow }: HomeContentProps): React.JSX.Element {
  return (
    <>
      {/* Best Sellers Section */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <FadeIn>
          <h2 className="mb-8 font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black sm:mb-12">
            Best sellers
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {bestSellersToShow.map((product, index) => (
            <FadeIn key={product.id} delay={index * 0.1}>
              <ProductCard {...product} />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Shop by Category Section */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <FadeIn>
          <h2 className="mb-8 font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black sm:mb-12">
            Shop by category
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Creams Category */}
          <FadeIn delay={0}>
            <Link href="/products?category=creams" className="group relative block aspect-4/5 overflow-hidden rounded-lg">
              <Image
                src="/homepage/category/creams.jpg"
                alt="Creams"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <button className="w-full rounded-full border-2 border-white/80 bg-white/10 px-8 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white backdrop-blur-[20px] backdrop-brightness-80 transition-all duration-300 group-hover:backdrop-brightness-100">
                  Creams
                </button>
              </div>
            </Link>
          </FadeIn>

          {/* Serums Category */}
          <FadeIn delay={0.1}>
            <Link href="/products?category=serums" className="group relative block aspect-4/5 overflow-hidden rounded-lg">
              <Image
                src="/homepage/category/serum.jpg"
                alt="Serums"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <button className="w-full rounded-full border-2 border-white/80 bg-white/10 px-8 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white backdrop-blur-[20px] backdrop-brightness-80 transition-all duration-300 group-hover:backdrop-brightness-100">
                  Serums
                </button>
              </div>
            </Link>
          </FadeIn>

          {/* Lotions Category */}
          <FadeIn delay={0.2}>
            <Link href="/products?category=lotions" className="group relative block aspect-4/5 overflow-hidden rounded-lg">
              <Image
                src="/homepage/category/lotion.jpg"
                alt="Lotions"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <button className="w-full rounded-full border-2 border-white/80 bg-white/10 px-8 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white backdrop-blur-[20px] backdrop-brightness-80 transition-all duration-300 group-hover:backdrop-brightness-100">
                  Lotions
                </button>
              </div>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <FadeIn>
          <h2 className="mb-8 font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black sm:mb-12">
            Featured products
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredToShow.map((product, index) => (
            <FadeIn key={product.id} delay={index * 0.1}>
              <ProductCard {...product} />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Product Highlight Section */}
      <section className="overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Image */}
          <FadeIn direction="left">
            <div className="relative aspect-square overflow-hidden rounded-2xl lg:aspect-5/4 xl:aspect-4/3 2xl:aspect-square">
              <Image
                src="/homepage/shop–the-face-mask.jpg"
                alt="Dream Peptide Complex Mask"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </FadeIn>

          {/* Content */}
          <FadeIn direction="right" delay={0.2}>
            <div className="flex h-full flex-col justify-center lg:px-12 xl:px-36 2xl:mx-auto 2xl:w-1/2 2xl:px-0">
              <h2 className="mb-6 font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black">
                Hydrate & revitalize with our pure face mask
              </h2>
              <p className="mb-8 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
                Indulge your skin with natural botanical extracts and oils. This mask hydrates, soothes, and restores glow for all skin types in minutes.
              </p>
              <div>
                <Link
                  href="/products"
                  className="inline-block rounded-full border border-[#999] bg-white/16 px-12 py-7 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#090909] transition-all duration-300 hover:bg-[#999] hover:text-white"
                >
                  Shop the face mask
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Product Banner Section */}
      <section className="px-4 py-8 sm:px-6 sm:py-12 lg:h-screen lg:px-8 lg:py-10 2xl:py-12">
        <div className="relative h-full overflow-hidden rounded-2xl">
          {/* Image */}
          <div className="relative aspect-4/3 lg:aspect-auto lg:h-full">
            <Image
              src="/homepage/pure-hydration-in-every-drop.webp"
              alt="Pure hydration in every drop"
              fill
              sizes="100vw"
              className="object-cover"
            />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Content Overlay */}
          <div className="absolute inset-0 flex px-6 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-12 2xl:px-16 2xl:py-16">
            <div className="flex w-full items-end justify-between gap-8">
              {/* Left Content */}
              <div className="max-w-2xl">
                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.5, delay: 0, ease: [0.25, 0.1, 0.25, 1] }}
                  className="mb-3 font-inter text-[12px] font-medium uppercase leading-[100%] tracking-[-0.72px] text-white sm:mb-4 sm:text-[16px] sm:tracking-[-0.96px] 2xl:mb-6 2xl:text-[20px] 2xl:tracking-[-1.2px]"
                >
                  ESSENCE FOR A BRIGHTER COMPLEXION
                </motion.p>

                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                  className="mb-6 font-inter text-[28px] font-medium leading-[100%] tracking-[-1.68px] text-white sm:mb-8 sm:text-[40px] sm:tracking-[-2.4px] 2xl:mb-12 2xl:text-[56px] 2xl:tracking-[-3.36px]"
                >
                  Pure hydration in every drop
                </motion.h2>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <Link
                    href="/products"
                    className="inline-block rounded-full border-2 border-white/80 bg-white/10 px-6 py-2.5 font-inter text-[14px] font-medium leading-[100%] tracking-[-0.84px] text-white backdrop-blur-[20px] backdrop-brightness-80 transition-all duration-300 hover:backdrop-brightness-100 sm:px-8 sm:py-3 sm:text-[16px] sm:tracking-[-0.96px] 2xl:px-10 2xl:py-4 2xl:text-[18px] 2xl:tracking-[-1.08px]"
                  >
                    Shop now
                  </Link>
                </motion.div>
              </div>

              {/* Right Product Card */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                className="hidden rounded-xl bg-white/10 p-4 backdrop-blur-[20px] lg:block 2xl:p-6"
              >
                <div className="flex items-center gap-4 2xl:gap-6">
                  <div className="relative h-24 w-24 shrink-0 rounded-lg bg-[url(/product.png)] bg-gray-300 bg-cover bg-no-repeat bg-position-[50%] 2xl:h-32 2xl:w-32" />
                  <div>
                    <h3 className="mb-2 mr-16 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white 2xl:mb-3 2xl:text-[20px] 2xl:tracking-[-1.2px]">
                      Face Toner
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#F7F7F7] line-through 2xl:text-[18px] 2xl:tracking-[-1.08px]">
                        $59.99
                      </span>
                      <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white 2xl:text-[18px] 2xl:tracking-[-1.08px]">
                        $47.99
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

    </>
  )
}
