"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export function HeroSection(): React.JSX.Element {
  return (
    <section className="relative h-screen">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/homepage/hero.jpg"
          alt="Pure Solution Essence Product"
          fill
          className="object-cover"
          priority
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Hero Content */}
      <div className="relative flex h-full items-end px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        <div className="max-w-3xl">
          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="mb-3 font-inter text-[16px] font-medium uppercase leading-[100%] tracking-[-0.96px] text-white"
          >
            DISCOVER NATURE&apos;S FINEST INGREDIENTS
          </motion.p>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.4,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="mb-6 font-inter text-[56px] font-medium leading-[100%] tracking-[-3.36px] text-white"
          >
            Glow with nature&apos;s finest,
            <br />
            every single day
          </motion.h1>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.6,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <Link
              href="/products"
              className="inline-block rounded-full border-2 border-white/80 bg-white/10 px-6 py-2.5 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white backdrop-blur-[20px] backdrop-brightness-80 transition-all duration-300 hover:backdrop-brightness-100 sm:px-8 sm:py-3 lg:px-8 lg:py-3 2xl:px-10 2xl:py-4"
            >
              Shop now
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
