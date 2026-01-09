'use client'

import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/public/logo.svg'
import { FadeIn } from '@/components/ui/FadeIn'

export function Footer(): React.JSX.Element {
  return (
    <footer className="border-t border-[#E3E3E3] bg-white">
      <div className="mx-auto px-6 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand Column */}
          <FadeIn delay={0}>
            <Link href="/" className="inline-block">
              <Image
                src={Logo}
                alt="KINGJESS"
                className="h-6 w-auto"
              />
            </Link>
            <div className="mt-12 flex items-center gap-4">
              <Link href="https://shopee.sg/kingjess9396" target="_blank" rel="noopener noreferrer" className="text-black hover:opacity-70">
                <svg role="img" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <title>Shopee</title>
                  <path d="M15.9414 17.9633c.229-1.879-.981-3.077-4.1758-4.0969-1.548-.528-2.277-1.22-2.26-2.1719.065-1.056 1.048-1.825 2.352-1.85a5.2898 5.2898 0 0 1 2.8838.89c.116.072.197.06.263-.039.09-.145.315-.494.39-.62.051-.081.061-.187-.068-.281-.185-.1369-.704-.4149-.983-.5319a6.4697 6.4697 0 0 0-2.5118-.514c-1.909.008-3.4129 1.215-3.5389 2.826-.082 1.1629.494 2.1078 1.73 2.8278.262.152 1.6799.716 2.2438.892 1.774.552 2.695 1.5419 2.478 2.6969-.197 1.047-1.299 1.7239-2.818 1.7439-1.2039-.046-2.2878-.537-3.1278-1.19l-.141-.11c-.104-.08-.218-.075-.287.03-.05.077-.376.547-.458.67-.077.108-.035.168.045.234.35.293.817.613 1.134.775a6.7097 6.7097 0 0 0 2.8289.727 4.9048 4.9048 0 0 0 2.0759-.354c1.095-.465 1.8029-1.394 1.9449-2.554zM11.9986 1.4009c-2.068 0-3.7539 1.95-3.8329 4.3899h7.6657c-.08-2.44-1.765-4.3899-3.8328-4.3899zm7.8516 22.5981-.08.001-15.7843-.002c-1.074-.04-1.863-.91-1.971-1.991l-.01-.195L1.298 6.2858a.459.459 0 0 1 .45-.494h4.9748C6.8448 2.568 9.1607 0 11.9996 0c2.8388 0 5.1537 2.5689 5.2757 5.7898h4.9678a.459.459 0 0 1 .458.483l-.773 15.5883-.007.131c-.094 1.094-.979 1.9769-2.0709 2.0059z"/>
                </svg>
              </Link>
              <Link href="https://www.lazada.sg/shop/kingjess-shop1621615269" target="_blank" rel="noopener noreferrer" className="hover:opacity-70">
                <Image
                  src="/icons/toppng.com-lazada-laz-square-black-app-icon-png-3513x3353 1.png"
                  alt="Lazada"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              </Link>
            </div>
          </FadeIn>

          {/* Support Column */}
          <FadeIn delay={0.2}>
            <h3 className="mb-12 text-[16px] font-medium uppercase leading-[100%] tracking-[-0.96px] text-[#999]">
              SUPPORT
            </h3>
            <ul className="space-y-4">
              <li>
                <Link href="/faqs" className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black hover:opacity-70">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/return-policy" className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black hover:opacity-70">
                  Return policy
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black hover:opacity-70">
                  Shipping policy
                </Link>
              </li>
              <li>
                <Link href="/terms-service" className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black hover:opacity-70">
                  Terms of service
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black hover:opacity-70">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </FadeIn>

          {/* Company Column */}
          <FadeIn delay={0.3}>
            <h3 className="mb-12 text-[16px] font-medium uppercase leading-[100%] tracking-[-0.96px] text-[#999]">
              COMPANY
            </h3>
            <ul className="space-y-4">
              <li>
                <Link href="/about" className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black hover:opacity-70">
                  About us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black hover:opacity-70">
                  Contact us
                </Link>
              </li>
            </ul>
          </FadeIn>
        </div>

        {/* Bottom Bar */}
        <FadeIn delay={0.4}>
          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[#E3E3E3] pt-16 sm:flex-row sm:items-center">
          <p className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
            © 2025 KINGJESS
          </p>
          <div className="flex items-center gap-6">
            <Link href="/terms-service" className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999] hover:text-black">
              Terms of service
            </Link>
            <Link href="/privacy-policy" className="text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999] hover:text-black">
              Privacy policy
            </Link>
          </div>
          </div>
        </FadeIn>
      </div>
    </footer>
  )
}
