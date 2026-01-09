"use client";

import { FadeIn } from '@/components/ui/FadeIn'

export default function AboutUsPage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-white">
      {/* Our Story Section - Hero with Text Overlay */}
      <section className="relative w-full">
        <div className="relative h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px]">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/homepage/about/picture1.jpg')`,
            }}
          />

          {/* Gradient Overlay - darker on left for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

          {/* Content */}
          <div className="relative z-10 h-full flex items-center">
            <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 w-full">
              <div className="max-w-lg">
                <FadeIn>
                  <p className="text-xs font-medium tracking-widest text-white/70 uppercase mb-4">
                    Our Story
                  </p>
                </FadeIn>
                <FadeIn delay={0.1}>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight mb-6">
                    Nature&apos;s finest for your skin
                  </h2>
                </FadeIn>
                <FadeIn delay={0.2}>
                  <p className="text-white/80 leading-relaxed text-sm md:text-base">
                    KingJess was born from a passion for natural skincare that truly works. We believe in
                    harnessing the power of nature to create products that nurture and restore your skin&apos;s
                    natural beauty.
                  </p>
                </FadeIn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Sets Us Apart Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          {/* Image */}
          <FadeIn direction="left">
            <div className="relative aspect-4/5 md:aspect-3/4 overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url('/homepage/about/picture2.jpg')`,
                }}
              />
            </div>
          </FadeIn>

          {/* Content */}
          <FadeIn direction="right" delay={0.1}>
            <div className="py-4 md:py-8">
              <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-4">
                Pure Ingredients, Pure Results
              </p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-neutral-900 tracking-tight mb-6">
                What sets us apart
              </h2>
              <p className="text-neutral-600 leading-relaxed text-sm md:text-base">
                At KingJess, we prioritize quality with every product.
                We source the finest natural ingredients, formulate them
                with care, and maintain a steadfast commitment to
                sustainability and transparency to ensure that every bottle
                reflects our dedication to your skin and the planet.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Our Promise Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          {/* Content - Order changes on mobile */}
          <FadeIn direction="left" className="order-2 md:order-1">
            <div className="py-4 md:py-8">
              <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-4">
                Glow With Confidence
              </p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-neutral-900 tracking-tight mb-6">
                Our promise to you
              </h2>
              <p className="text-neutral-600 leading-relaxed text-sm md:text-base">
                We&apos;re here to support your journey to radiant, healthy skin. Without harsh chemicals or
                additives, KingJess promises to deliver skincare that&apos;s
                gentle, effective, and rooted in the goodness of nature. Let
                us be your trusted partner in achieving the glowing
                complexion you deserve.
              </p>
            </div>
          </FadeIn>

          {/* Image */}
          <FadeIn direction="right" delay={0.1} className="order-1 md:order-2">
            <div className="relative aspect-4/5 md:aspect-3/4 overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url('/homepage/about/picture3.jpg')`,
                }}
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Bottom Cards Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-8 md:py-12 pb-16 md:pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Our Formulation Process Card */}
          <FadeIn delay={0}>
            <div className="relative aspect-4/3 md:aspect-[16/10] overflow-hidden group">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: `url('/homepage/about/picture4.jpg')`,
                }}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/30" />

              {/* Content */}
              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                <h3 className="text-xl md:text-2xl font-semibold text-white tracking-tight mb-2">
                  Our formulation process
                </h3>
                <p className="text-white/80 text-xs md:text-sm leading-relaxed max-w-sm">
                  At KingJess, every product is developed with precision by our team of
                  skincare experts. We blend science and nature, rigorously testing each
                  formula for purity, effectiveness, and safety. Our meticulous process ensures that
                  only the best reaches your skin, delivering results you can trust.
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Building a Community Card */}
          <FadeIn delay={0.1}>
            <div className="relative aspect-4/3 md:aspect-[16/10] overflow-hidden group">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: `url('/homepage/about/picture5.jpg')`,
                }}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/30" />

              {/* Content */}
              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                <h3 className="text-xl md:text-2xl font-semibold text-white tracking-tight mb-2">
                  Building a community of glow
                </h3>
                <p className="text-white/80 text-xs md:text-sm leading-relaxed max-w-sm">
                  KingJess is more than a brand—it&apos;s a community. We listen to your needs,
                  celebrate your skincare wins, and connect with real skincare lovers. Join
                  us on social media, share your glow, and be part of a movement that
                  believes in the power of natural beauty.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Subscribe Section */}
      <section className="relative w-full">
        <div className="relative h-[450px] md:h-[700px] overflow-hidden">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/homepage/return-policy-img.jpg')`,
            }}
          />

          {/* Content - Left aligned */}
          <div className="relative z-10 h-full flex flex-col justify-center items-center px-8 md:px-16 lg:px-24">
            <div className="max-w-md">
              <FadeIn>
                <h2 className="text-3xl md:text-4xl font-normal text-white mb-4 tracking-tight leading-tight">
                  Subscribe for
                  <br />
                  exclusive deals
                </h2>
              </FadeIn>
              <FadeIn delay={0.1}>
                <p className="text-white/90 text-sm md:text-base mb-8 leading-relaxed">
                  Get exclusive access to the latest natural skincare deals
                  <br className="hidden md:block" />
                  and tips delivered straight to your inbox!
                </p>
              </FadeIn>

              {/* Email Form - Underline style */}
              <FadeIn delay={0.2}>
                <form className="w-full max-w-sm">
                  <div className="relative flex items-center border-b border-white/60">
                    <input
                      type="email"
                      id="about-email"
                      name="email"
                      placeholder="Enter your email"
                      className="w-full py-3 bg-transparent text-white placeholder-white/70 text-sm focus:outline-none transition-all duration-300"
                      required
                    />
                    <button
                      type="submit"
                      className="cursor-pointer text-white text-xl hover:translate-x-1 transition-transform duration-300"
                      aria-label="Subscribe"
                    >
                      →
                    </button>
                  </div>
                </form>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}