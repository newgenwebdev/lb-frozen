"use client";

import Image from "next/image";
import Link from "next/link";
import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import NewsletterFooter from "@/components/shared/NewsletterFooter";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ProtectedNavbar />

      {/* Breadcrumb */}
      <div className="mx-auto px-4 lg:px-6 pt-4 lg:pt-6 bg-white">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
          <Link href="/" className="hover:text-gray-900">
            Home
          </Link>
          <span>›</span>
          <span className="text-gray-900 font-medium">About Us</span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white px-4 lg:px-6 py-6 lg:py-10">
        <div className="relative rounded-3xl overflow-hidden bg-linear-to-br from-[#C52129] via-[#8B3A8F] to-[#23429B] p-8 lg:p-16 min-h-[280px] lg:min-h-[420px] flex items-center">
          {/* Decorative rings - desktop */}
          <div
            className="hidden lg:block absolute rounded-full pointer-events-none"
            style={{
              width: "600px",
              height: "600px",
              top: "-200px",
              right: "-150px",
              border: "50px solid rgba(255, 255, 255, 0.12)",
              zIndex: 1,
            }}
          />
          <div
            className="hidden lg:block absolute rounded-full pointer-events-none"
            style={{
              width: "400px",
              height: "400px",
              top: "-100px",
              right: "-50px",
              border: "40px solid rgba(255, 255, 255, 0.18)",
              zIndex: 1,
            }}
          />

          {/* Decorative rings - mobile */}
          <div
            className="lg:hidden absolute rounded-full pointer-events-none"
            style={{
              width: "300px",
              height: "300px",
              top: "-100px",
              right: "-100px",
              border: "25px solid rgba(255, 255, 255, 0.12)",
              zIndex: 1,
            }}
          />

          <div className="relative z-10 max-w-2xl">
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs lg:text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              EST. 1996 · KUALA LUMPUR
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              About LB Frozen Food
            </h1>
            <p className="text-white/90 text-sm sm:text-base lg:text-lg leading-relaxed">
              From a humble family kitchen to a trusted frozen food supplier
              across Malaysia — discover the story behind nearly three decades
              of consistent quality, fair pricing, and reliable supply.
            </p>
          </div>

          {/* Lobster decoration - desktop */}
          <div
            className="hidden lg:block absolute pointer-events-none"
            style={{
              width: "320px",
              height: "320px",
              bottom: "-60px",
              right: "20px",
              zIndex: 2,
            }}
          >
            <Image
              src="/lobster-bg-removed.png"
              alt=""
              width={320}
              height={320}
              className="object-contain"
              style={{ transform: "rotate(25deg)" }}
            />
          </div>
        </div>
      </div>

      {/* Business Basics Cards */}
      <div className="bg-white px-4 lg:px-6 pb-8 lg:pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-gray-50 rounded-2xl p-5 lg:p-6 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-[#C52129]/10 flex items-center justify-center mb-3">
              <svg
                className="w-5 h-5 lg:w-6 lg:h-6 text-[#C52129]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mb-1">Founded</p>
            <p className="text-lg lg:text-xl font-bold text-gray-900">1996</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 lg:p-6 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-[#23429B]/10 flex items-center justify-center mb-3">
              <svg
                className="w-5 h-5 lg:w-6 lg:h-6 text-[#23429B]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mb-1">Founder</p>
            <p className="text-lg lg:text-xl font-bold text-gray-900">
              Liaw Meng Lay
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 lg:p-6 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-[#C52129]/10 flex items-center justify-center mb-3">
              <svg
                className="w-5 h-5 lg:w-6 lg:h-6 text-[#C52129]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mb-1">Headquarters</p>
            <p className="text-sm lg:text-base font-semibold text-gray-900 leading-tight">
              Sri Damansara, Kuala Lumpur
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 lg:p-6 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-[#23429B]/10 flex items-center justify-center mb-3">
              <svg
                className="w-5 h-5 lg:w-6 lg:h-6 text-[#23429B]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mb-1">Business Type</p>
            <p className="text-sm lg:text-base font-semibold text-gray-900 leading-tight">
              Wholesale & Retail
            </p>
          </div>
        </div>
      </div>

      {/* Brand Story */}
      <div className="bg-gray-50 py-10 lg:py-16">
        <div className="mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div>
              <span className="inline-block text-[#C52129] text-xs lg:text-sm font-semibold tracking-wider uppercase mb-3">
                Our Story
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                From a family kitchen to Malaysia&apos;s trusted frozen food
                partner
              </h2>
              <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden aspect-[4/3] bg-linear-to-br from-[#23429B] to-[#192F6E] mt-6">
                <Image
                  src="/premium-seafood.png"
                  alt="LB Frozen Food premium products"
                  fill
                  className="object-cover opacity-90"
                />
              </div>
            </div>

            <div className="space-y-5 text-sm lg:text-base text-gray-700 leading-relaxed">
              <p>
                LB Frozen Food Marketing Sdn. Bhd. was established in{" "}
                <span className="font-semibold text-gray-900">1996</span>,
                originating from a humble family-run business. It began with the
                handmade production of homemade pork meatballs, gradually
                building a strong foundation step by step. In its early days,
                the company mainly supplied local hawkers, helping them deliver
                consistent and delicious food to their customers.
              </p>
              <p>
                With a strong commitment to freshness and strict quality
                control, LB Frozen Food steadily built a solid reputation in the
                market. As customer demand grew, the company continuously
                expanded its product range, introducing a variety of in-house
                products such as{" "}
                <span className="font-semibold text-gray-900">
                  beancurd sheets, dim sum, and traditional local delicacies
                </span>
                . This expansion not only provided customers with more choices
                but also strengthened the company&apos;s overall
                competitiveness.
              </p>
              <p>
                Over the years, LB Frozen Food has evolved from a small
                home-based operation into a comprehensive frozen food supplier,
                serving both wholesale and retail markets. Today, its customer
                base extends beyond hawkers to include{" "}
                <span className="font-semibold text-gray-900">
                  restaurants, grocery stores, and mini marts
                </span>
                .
              </p>
              <p>
                Throughout its journey, the company has remained committed to
                its core values of consistent quality, fair pricing, and
                reliable supply. LB Frozen Food strives to provide customers
                with convenient, time-saving, and trustworthy frozen food
                solutions, while continuing to be a dependable long-term partner
                for its clients.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Values */}
      <div className="bg-white py-10 lg:py-16">
        <div className="mx-auto px-4 lg:px-6">
          <div className="text-center mb-8 lg:mb-12">
            <span className="inline-block text-[#C52129] text-xs lg:text-sm font-semibold tracking-wider uppercase mb-3">
              What We Stand For
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Our core values
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-gray-50 rounded-2xl lg:rounded-3xl p-6 lg:p-8 border border-gray-100 hover:border-[#23429B]/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-[#C52129] flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 lg:w-7 lg:h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
                Consistent Quality
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Strict quality control at every step ensures freshness and
                safety from production to your kitchen.
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl lg:rounded-3xl p-6 lg:p-8 border border-gray-100 hover:border-[#23429B]/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-[#23429B] flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 lg:w-7 lg:h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
                Fair Pricing
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Honest, competitive pricing for every customer — from local
                hawkers to large restaurants and retail stores.
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl lg:rounded-3xl p-6 lg:p-8 border border-gray-100 hover:border-[#23429B]/30 hover:shadow-md transition-all">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-[#C52129] flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 lg:w-7 lg:h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
                Reliable Supply
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                A dependable long-term partner you can count on, with
                convenient, time-saving frozen food solutions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Segments */}
      <div className="bg-[#23429B] py-10 lg:py-16 relative overflow-hidden">
        <div
          className="hidden lg:block absolute rounded-full pointer-events-none"
          style={{
            width: "500px",
            height: "500px",
            top: "-150px",
            left: "-150px",
            border: "40px solid rgba(255, 255, 255, 0.08)",
            zIndex: 1,
          }}
        />
        <div className="mx-auto px-4 lg:px-6 relative z-10">
          <div className="text-center mb-8 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              Who we serve
            </h2>
            <p className="text-white/80 text-sm lg:text-base max-w-2xl mx-auto">
              From the hawker stall to the dining table, our frozen food
              solutions reach a diverse community of customers across Malaysia.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            {[
              { label: "Hawkers", icon: "🍜" },
              { label: "Restaurants", icon: "🍽️" },
              { label: "Grocery Stores", icon: "🛒" },
              { label: "Mini Marts", icon: "🏪" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 lg:p-6 text-center hover:bg-white/15 transition-colors"
              >
                <div className="text-3xl lg:text-4xl mb-2">{item.icon}</div>
                <p className="text-white font-semibold text-sm lg:text-base">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white py-10 lg:py-16">
        <div className="mx-auto px-4 lg:px-6">
          <div className="bg-linear-to-r from-[#C52129] to-[#23429B] rounded-2xl lg:rounded-3xl p-8 lg:p-12 text-center text-white">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
              Ready to taste the difference?
            </h2>
            <p className="text-white/90 text-sm lg:text-base mb-6 max-w-xl mx-auto">
              Browse our full selection of frozen meatballs, dim sum, beancurd
              sheets, and local delicacies — delivered fresh and frozen, just
              the way you like it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/products"
                className="bg-white text-[#23429B] px-6 lg:px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors text-sm lg:text-base"
              >
                Shop Products
              </Link>
              <Link
                href="/contact-us"
                className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-6 lg:px-8 py-3 rounded-full font-semibold hover:bg-white/20 transition-colors text-sm lg:text-base"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>

      <NewsletterFooter />
    </div>
  );
}
