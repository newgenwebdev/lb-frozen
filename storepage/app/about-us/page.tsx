"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Fish, UtensilsCrossed, ShoppingCart, Store } from "lucide-react";
import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import NewsletterFooter from "@/components/shared/NewsletterFooter";
import Breadcrumb from "@/components/shared/Breadcrumb";

const storyFrames = [
  {
    image: "/food5.jpg",
    backdrop: "single" as const,
    paragraph: (
      <>
        LB Frozen Food Marketing Sdn. Bhd. was{" "}
        <span className="font-semibold text-gray-900">
          established in 1996,
        </span>{" "}
        originating from a humble family-run business. It began with the{" "}
        <span className="font-semibold text-gray-900">handmade production</span>{" "}
        of homemade pork meatballs, gradually building a strong foundation step
        by step.{" "}
        <span className="font-semibold text-gray-900">In its early days,</span>{" "}
        the company mainly supplied local hawkers, helping them deliver
        consistent and delicious food to their customers.
      </>
    ),
  },
  {
    image: "/food6.jpg",
    backdrop: "stacked" as const,
    paragraph: (
      <>
        With a{" "}
        <span className="font-semibold text-gray-900">strong commitment</span>{" "}
        to freshness and strict quality control, LB Frozen Food steadily built
        a solid reputation in the market. As customer demand grew, the company
        continuously expanded its product range,{" "}
        <span className="font-semibold text-gray-900">
          introducing a variety of in-house products
        </span>{" "}
        such as beancurd sheets, dim sum, and traditional local delicacies.
        This expansion not only provided customers with more choices but also{" "}
        <span className="font-semibold text-gray-900">
          strengthened the company&apos;s overall competitiveness.
        </span>
      </>
    ),
  },
  {
    image: "/food7.jpg",
    backdrop: "stacked" as const,
    paragraph: (
      <>
        Over the years, LB Frozen Food has evolved from a small home-based
        operation into a comprehensive frozen food supplier, serving both
        wholesale and retail markets. Today, its customer base extends beyond
        hawkers to include{" "}
        <span className="font-semibold text-gray-900">
          restaurants, grocery stores, and mini marts.
        </span>
      </>
    ),
  },
];

export default function AboutUsPage() {
  const storyRef = useRef<HTMLDivElement>(null);
  const [storyFrame, setStoryFrame] = useState(0);

  useEffect(() => {
    let raf = 0;
    const handleScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = storyRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scrollableHeight = rect.height - window.innerHeight;
        if (scrollableHeight <= 0) return;
        const progress = Math.max(
          0,
          Math.min(1, -rect.top / scrollableHeight)
        );
        let next = 0;
        if (progress >= 0.66) next = 2;
        else if (progress >= 0.33) next = 1;
        setStoryFrame(next);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <ProtectedNavbar />

      <div className="mx-auto px-4 lg:px-6 pt-4 lg:pt-6 bg-white">
        <Breadcrumb
          className="flex items-center gap-2 text-xs sm:text-sm text-gray-600"
          items={[
            { label: "Home", href: "/" },
            { label: "About Us" },
          ]}
        />
      </div>

      {/* Hero Section */}
      <div className="bg-white px-4 lg:px-6 py-10 lg:py-16">
        <div className="max-w-5xl mx-auto text-center">
          {/* Rating pill */}
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-full pl-2 pr-4 py-1.5 mb-8 shadow-sm">
            <div className="flex -space-x-2">
              {["/person1.jpg", "/person2.jpg", "/person3.jpg"].map((src) => (
                <div
                  key={src}
                  className="w-7 h-7 rounded-full border-2 border-white overflow-hidden bg-gray-100"
                >
                  <Image
                    src={src}
                    alt=""
                    width={28}
                    height={28}
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
            </div>
            <span className="text-sm font-medium text-gray-700">120+ Review</span>
            <div className="flex items-center gap-0.5 text-amber-400">
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-500">(4.8)</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-[1.1] tracking-tight">
            Fresh Taste, Frozen for
            <br />
            Your Convenience
          </h1>

          {/* Subtitle */}
          <p className="text-gray-600 text-sm lg:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            From a humble family kitchen to a trusted frozen food supplier
            across Malaysia — discover the story behind nearly three decades of
            consistent quality, fair pricing, and reliable supply.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12 lg:mb-16">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-[#C52129] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#A51820] transition-colors text-sm lg:text-base"
            >
              Explore Menu
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
            <Link
              href="/contact-us"
              className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-900 px-6 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors text-sm lg:text-base"
            >
              Book Order
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </Link>
          </div>

          {/* Food circles with chat bubbles */}
          <div className="relative h-56 sm:h-64 lg:h-80 max-w-4xl mx-auto">
            {/* Left circle */}
            <div className="absolute left-0 sm:left-4 lg:left-12 top-2">
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-44 lg:h-44 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-lg">
                  <Image
                    src="/food1.png"
                    alt=""
                    width={176}
                    height={176}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="absolute -right-6 lg:-right-8 top-6 lg:top-8 bg-white shadow-md rounded-full px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-xs font-medium text-gray-900">
                    Love this!
                  </span>
                  <span className="text-sm">🦐</span>
                </div>
              </div>
            </div>

            {/* Center circle */}
            <div className="absolute left-1/2 -translate-x-1/2 top-10 lg:top-16">
              <div className="relative">
                <div className="w-36 h-36 sm:w-44 sm:h-44 lg:w-56 lg:h-56 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-lg">
                  <Image
                    src="/food2.png"
                    alt=""
                    width={224}
                    height={224}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="absolute -right-2 top-8 lg:top-10 bg-white shadow-md rounded-full px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-xs font-medium text-gray-900">
                    So delicious
                  </span>
                  <span className="text-sm">🦀</span>
                </div>
              </div>
            </div>

            {/* Right circle */}
            <div className="absolute right-0 sm:right-4 lg:right-12 top-0">
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-44 lg:h-44 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-lg">
                  <Image
                    src="/food3.png"
                    alt=""
                    width={176}
                    height={176}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="absolute -left-6 lg:-left-8 top-6 lg:top-8 bg-white shadow-md rounded-full px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-xs font-medium text-gray-900">
                    Yummyyy
                  </span>
                  <span className="text-sm">🐟</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="bg-white px-4 lg:px-6 py-10 lg:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 lg:mb-12">
            <span className="inline-block text-[#C52129] text-xs lg:text-sm font-bold tracking-wider uppercase mb-3">
              Why Choose Us
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 max-w-3xl mx-auto leading-tight tracking-tight">
              Quick facts that highlight our quality, freshness, and trusted
              frozen supply
            </h2>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
            {/* Card 1: Wide Frozen Seafood (red, tall) */}
            <div className="lg:row-span-2 relative bg-linear-to-b from-[#C52129] to-[#203C8D] rounded-3xl p-6 lg:p-8 overflow-hidden min-h-[360px] lg:min-h-[480px]">
              {/* Decorative concentric rings - desktop */}
              <div
                className="hidden lg:block absolute rounded-full pointer-events-none"
                style={{
                  width: "560px",
                  height: "560px",
                  bottom: "-360px",
                  right: "-180px",
                  border: "55px solid #192F6E",
                  zIndex: 1,
                }}
              />
              <div
                className="hidden lg:block absolute rounded-full pointer-events-none"
                style={{
                  width: "380px",
                  height: "380px",
                  bottom: "-280px",
                  right: "-100px",
                  border: "45px solid #192F6E",
                  zIndex: 1,
                }}
              />

              {/* Decorative concentric rings - mobile */}
              <div
                className="lg:hidden absolute rounded-full pointer-events-none"
                style={{
                  width: "300px",
                  height: "300px",
                  bottom: "-200px",
                  right: "-100px",
                  border: "30px solid #192F6E",
                  zIndex: 1,
                }}
              />
              <div
                className="lg:hidden absolute rounded-full pointer-events-none"
                style={{
                  width: "210px",
                  height: "210px",
                  bottom: "-157px",
                  right: "-60px",
                  border: "25px solid #192F6E",
                  zIndex: 1,
                }}
              />

              <div className="relative z-10">
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-3 leading-tight">
                  Wide Frozen Seafood
                  <br />
                  Selection
                </h3>
                <p className="text-white/85 text-sm max-w-[16rem] leading-relaxed">
                  From fish balls, seafood tofu, crab sticks, and more — ready
                  for every kitchen need.
                </p>
              </div>

              {/* Lobster - desktop */}
              <div
                className="hidden lg:block absolute pointer-events-none"
                style={{
                  width: "340px",
                  height: "340px",
                  bottom: "-60px",
                  right: "-40px",
                  zIndex: 2,
                }}
              >
                <Image
                  src="/lobster-bg-removed.png"
                  alt=""
                  width={340}
                  height={340}
                  className="object-contain"
                  style={{ transform: "rotate(45deg)" }}
                />
              </div>

              {/* Lobster - mobile */}
              <div
                className="lg:hidden absolute pointer-events-none"
                style={{
                  width: "200px",
                  height: "200px",
                  bottom: "-30px",
                  right: "-20px",
                  zIndex: 2,
                }}
              >
                <Image
                  src="/lobster-bg-removed.png"
                  alt=""
                  width={200}
                  height={200}
                  className="object-contain"
                  style={{ transform: "rotate(45deg)" }}
                />
              </div>
            </div>

            {/* Card 2: 25+ variety (blue) */}
            <div className="bg-[#23429B] rounded-3xl p-6 lg:p-8 min-h-[150px] lg:min-h-[230px] flex items-start">
              <h3 className="text-xl lg:text-2xl font-bold text-white leading-tight tracking-tight">
                25+ A variety of fresh and quality seafood
              </h3>
            </div>

            {/* Card 3: Affordable Quality (image, tall) */}
            <div className="lg:col-start-3 lg:row-start-1 lg:row-span-2 relative rounded-3xl overflow-hidden min-h-[320px] lg:min-h-[480px]">
              <Image
                src="/food4.jpg"
                alt=""
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 z-10">
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-2 leading-tight">
                  Affordable Quality for Every Home
                </h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  Providing fair pricing so families and businesses can enjoy
                  seafood anytime.
                </p>
              </div>
            </div>

            {/* Card 4: Affordable (gray) */}
            <div className="bg-gray-100 rounded-3xl p-6 lg:p-8 min-h-[150px] lg:min-h-[230px] flex items-start lg:col-start-2 lg:row-start-2">
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900 leading-tight tracking-tight">
                Affordable Seafood, Trusted Quality
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Our Story - Mobile (stacked, no animation) */}
      <div className="lg:hidden bg-white py-12 px-4">
        <div className="max-w-md mx-auto">
          <span className="inline-block text-[#C52129] text-xs font-bold tracking-wider uppercase mb-3">
            Our Story
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 leading-[1.15] tracking-tight">
            From a family kitchen to Malaysia&apos;s trusted frozen food
            partner
          </h2>

          <div className="space-y-12">
            {storyFrames.map((frame, i) => (
              <div key={i}>
                <div className="relative w-full max-w-xs mx-auto aspect-[4/5] mb-6">
                  {frame.backdrop === "single" ? (
                    <div
                      className="absolute inset-0 bg-[#23429B] rounded-2xl"
                      style={{ transform: "rotate(-6deg)" }}
                    />
                  ) : (
                    <>
                      <div
                        className="absolute inset-0 bg-[#C52129] rounded-2xl"
                        style={{
                          transform: "translate(-10px, 10px) rotate(-4deg)",
                        }}
                      />
                      <div
                        className="absolute inset-0 bg-[#23429B] rounded-2xl"
                        style={{
                          transform: "translate(10px, -10px) rotate(4deg)",
                        }}
                      />
                    </>
                  )}
                  <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl">
                    <Image
                      src={frame.image}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {frame.paragraph}
                </p>
              </div>
            ))}
          </div>

          {/* Stats table */}
          <div className="mt-12">
            <dl className="divide-y divide-gray-200">
              <div className="flex items-center justify-between py-4">
                <dt className="text-sm text-gray-500">Founded</dt>
                <dd className="text-sm font-bold text-gray-900">1996</dd>
              </div>
              <div className="flex items-center justify-between py-4">
                <dt className="text-sm text-gray-500">Founder</dt>
                <dd className="text-sm font-bold text-gray-900">
                  Liaw Meng Lay
                </dd>
              </div>
              <div className="flex items-center justify-between py-4">
                <dt className="text-sm text-gray-500">Headquarters</dt>
                <dd className="text-sm font-bold text-gray-900">
                  Sri Damansara, Kuala Lumpur
                </dd>
              </div>
              <div className="flex items-center justify-between py-4">
                <dt className="text-sm text-gray-500">Business Type</dt>
                <dd className="text-sm font-bold text-gray-900">
                  Wholesale & Retail
                </dd>
              </div>
            </dl>

            <div className="flex items-center gap-2 mt-6">
              <div className="w-12 h-12 rounded-full bg-[#C52129]/15 ring-2 ring-white overflow-hidden flex items-center justify-center">
                <Image
                  src="/crab.png"
                  alt=""
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="w-12 h-12 rounded-full bg-[#23429B]/15 ring-2 ring-white overflow-hidden flex items-center justify-center -ml-3">
                <Image
                  src="/lobster.png"
                  alt=""
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 ring-2 ring-white overflow-hidden flex items-center justify-center -ml-3">
                <Image
                  src="/shrimp.png"
                  alt=""
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Our Story - Desktop (scroll-pinned animation) */}
      <div
        ref={storyRef}
        className="hidden lg:block relative bg-white"
        style={{ height: "250vh" }}
      >
        <div className="sticky top-0 h-screen flex items-center overflow-hidden">
          <div className="max-w-7xl w-full mx-auto px-4 lg:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-center">
              {/* Left column: heading (static) + animated paragraph */}
              <div>
                <span className="inline-block text-[#C52129] text-xs lg:text-sm font-bold tracking-wider uppercase mb-3">
                  Our Story
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-[2.25rem] font-bold text-gray-900 mb-5 leading-[1.15] tracking-tight">
                  From a family kitchen to Malaysia&apos;s trusted frozen food
                  partner
                </h2>
                <div className="relative min-h-[200px] lg:min-h-[180px]">
                  {storyFrames.map((frame, i) => (
                    <p
                      key={i}
                      className={`absolute inset-0 text-sm text-gray-600 leading-relaxed transition-opacity duration-500 ${
                        storyFrame === i
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none"
                      }`}
                    >
                      {frame.paragraph}
                    </p>
                  ))}
                </div>

                {/* Progress indicator */}
                <div className="flex items-center gap-2 mt-6">
                  {storyFrames.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        storyFrame === i
                          ? "w-8 bg-[#C52129]"
                          : "w-4 bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Middle column: animated image + backdrop */}
              <div className="relative w-full max-w-sm mx-auto aspect-[4/5]">
                {storyFrames.map((frame, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      storyFrame === i ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {frame.backdrop === "single" ? (
                      <div
                        className="absolute inset-0 bg-[#23429B] rounded-2xl lg:rounded-3xl"
                        style={{ transform: "rotate(-6deg)" }}
                      />
                    ) : (
                      <>
                        <div
                          className="absolute inset-0 bg-[#C52129] rounded-2xl lg:rounded-3xl"
                          style={{
                            transform: "translate(-14px, 14px) rotate(-4deg)",
                          }}
                        />
                        <div
                          className="absolute inset-0 bg-[#23429B] rounded-2xl lg:rounded-3xl"
                          style={{
                            transform: "translate(14px, -14px) rotate(4deg)",
                          }}
                        />
                      </>
                    )}
                    <div className="relative w-full h-full rounded-2xl lg:rounded-3xl overflow-hidden shadow-xl">
                      <Image
                        src={frame.image}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right column: stats table (static) */}
              <div>
                <dl className="divide-y divide-gray-200">
                  <div className="flex items-center justify-between py-4">
                    <dt className="text-sm text-gray-500">Founded</dt>
                    <dd className="text-sm font-bold text-gray-900">1996</dd>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <dt className="text-sm text-gray-500">Founder</dt>
                    <dd className="text-sm font-bold text-gray-900">
                      Liaw Meng Lay
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <dt className="text-sm text-gray-500">Headquarters</dt>
                    <dd className="text-sm font-bold text-gray-900">
                      Sri Damansara, Kuala Lumpur
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <dt className="text-sm text-gray-500">Business Type</dt>
                    <dd className="text-sm font-bold text-gray-900">
                      Wholesale & Retail
                    </dd>
                  </div>
                </dl>

                {/* Decorative product circles */}
                <div className="flex items-center gap-2 mt-6">
                  <div className="w-12 h-12 rounded-full bg-[#C52129]/15 ring-2 ring-white overflow-hidden flex items-center justify-center">
                    <Image
                      src="/crab.png"
                      alt=""
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#23429B]/15 ring-2 ring-white overflow-hidden flex items-center justify-center -ml-3">
                    <Image
                      src="/lobster.png"
                      alt=""
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-amber-100 ring-2 ring-white overflow-hidden flex items-center justify-center -ml-3">
                    <Image
                      src="/shrimp.png"
                      alt=""
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Who We Served */}
      <div className="bg-white py-10 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-8 lg:mb-12">
            <span className="inline-block text-[#C52129] text-xs lg:text-sm font-bold tracking-wider uppercase mb-3">
              Who We Served
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 max-w-3xl mx-auto leading-tight tracking-tight">
              From hawker stalls to homes, our frozen food serves Malaysia.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {[
              {
                label: "Hawkers",
                description:
                  "Ready-to-cook products that help hawkers serve faster, reduce prep time, and maintain consistent taste.",
                Icon: Fish,
                iconColor: "text-[#23429B]",
              },
              {
                label: "Restaurants",
                description:
                  "Quality frozen seafood and food products made to support daily operations, menu variety, and smooth kitchen flow.",
                Icon: UtensilsCrossed,
                iconColor: "text-[#C52129]",
              },
              {
                label: "Grocery Stores",
                description:
                  "A wide selection of frozen food products that are easy to stock, easy to sell, and suitable for family needs.",
                Icon: ShoppingCart,
                iconColor: "text-[#23429B]",
              },
              {
                label: "Mini Marts",
                description:
                  "Compact, fast-moving frozen food options perfect for customers looking for quick, affordable, and tasty meals.",
                Icon: Store,
                iconColor: "text-[#C52129]",
              },
            ].map(({ label, description, Icon, iconColor }) => (
              <div
                key={label}
                className="bg-gray-50 rounded-2xl lg:rounded-3xl p-6 lg:p-8 hover:shadow-md transition-shadow"
              >
                <Icon
                  className={`w-9 h-9 lg:w-10 lg:h-10 ${iconColor} mb-16 lg:mb-20`}
                  strokeWidth={1.75}
                />
                <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-2">
                  {label}
                </h3>
                <p className="text-xs lg:text-sm text-gray-600 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white py-10 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="bg-linear-to-b from-[#23429B] via-[#8B3A8F] to-[#C52129] rounded-2xl lg:rounded-3xl p-8 lg:p-16 text-center text-white">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight tracking-tight">
              Ready to taste the difference?
            </h2>
            <p className="text-white/90 text-sm lg:text-base mb-7 max-w-xl mx-auto leading-relaxed">
              Browse our full selection of frozen meatballs, dim sum, beancurd
              sheets, and local delicacies — delivered fresh and frozen, just
              the way you like it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-6 lg:px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors text-sm lg:text-base"
              >
                Explore Menu
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
              <Link
                href="/contact-us"
                className="inline-flex items-center justify-center gap-2 bg-white/15 backdrop-blur-sm border border-white/30 text-white px-6 lg:px-8 py-3 rounded-full font-semibold hover:bg-white/25 transition-colors text-sm lg:text-base"
              >
                Book Order
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <NewsletterFooter />
    </div>
  );
}
