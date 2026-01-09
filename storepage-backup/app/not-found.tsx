'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function NotFound(): React.JSX.Element {
  return (
    <main className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-center"
      >
        <span className="text-[12px] font-medium uppercase tracking-widest text-[#999]">
          Error 404
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        className="mt-4 text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-neutral-900 sm:text-[56px] sm:tracking-[-3.36px]"
      >
        Page Not Found
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="mt-6 max-w-md text-center text-[16px] font-medium leading-[150%] tracking-[-0.96px] text-[#999]"
      >
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-6"
      >
        <Link
          href="/"
          className="cursor-pointer rounded-full bg-black px-8 py-4 text-center text-[14px] font-medium tracking-[-0.84px] text-white transition-opacity duration-300 hover:opacity-80"
        >
          Back to Home
        </Link>
        <Link
          href="/products"
          className="cursor-pointer rounded-full border border-[#E3E3E3] bg-white px-8 py-4 text-center text-[14px] font-medium tracking-[-0.84px] text-black transition-colors duration-300 hover:border-black"
        >
          Browse Products
        </Link>
      </motion.div>
    </main>
  )
}
