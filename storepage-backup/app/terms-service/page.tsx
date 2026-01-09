"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";

export default function TermsOfServicePage(): React.JSX.Element {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent): void => {
    e.preventDefault();
    console.log("Subscribed:", email);
    setEmail("");
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] font-sans mt-14">
      {/* Terms of Service Content */}
      <section className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <header className="mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-4xl text-black md:text-5xl tracking-tight font-semibold mb-6"
          >
            Terms of service
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-neutral-600 leading-relaxed text-base"
          >
            At KingJess, we&apos;re committed to ensuring you love your natural skincare products. If
            you&apos;re not completely satisfied, we&apos;re here to help with a simple and transparent return
            process. Please review our policy below to understand how returns and refunds work.
          </motion.p>
        </header>

        {/* Policy Sections */}
        <div className="space-y-10">
          {/* Acceptance of terms */}
          <PolicySection title="Acceptance of terms" delay={0}>
            <p>
              We accept returns within 30 days of delivery, provided the product is unused,
              unopened, and in its original packaging with all labels intact. This ensures the integrity
              of our natural skincare items for safety and hygiene reasons. Items purchased during
              promotional sales or with gift cards are also eligible for return under the same
              conditions.
            </p>
          </PolicySection>

          {/* Product use and limitations */}
          <PolicySection title="Product use and limitations" delay={0.05}>
            <p>
              To start a return, contact our customer support team via email with your order number
              and a brief reason for the return. We&apos;ll provide you with a return label, which you can use
              to ship the item back to us. Please ensure the product is sent within 7 days of receiving
              the label, and keep your tracking information until the return is processed.
            </p>
          </PolicySection>

          {/* Ordering and payment */}
          <PolicySection title="Ordering and payment" delay={0.1}>
            <p>
              Once we receive your returned item, we&apos;ll inspect it to confirm it meets our return
              criteria. After approval, your refund will be processed within 5-7 business days, and the
              amount will be credited back to your original payment method. You&apos;ll receive a
              confirmation email once the refund is complete, keeping you informed every step of the
              way.
            </p>
          </PolicySection>

          {/* Intellectual property */}
          <PolicySection title="Intellectual property" delay={0.15}>
            <p>
              Due to hygiene and safety standards, we cannot accept returns on used or opened
              products. Additionally, gift cards, free samples, or promotional items included with your
              purchase are not eligible for return. If you&apos;re unsure about a product&apos;s eligibility, reach
              out to our team, and we&apos;ll assist you promptly.
            </p>
          </PolicySection>

          {/* Liability and disclaimers */}
          <PolicySection title="Liability and disclaimers" delay={0.2}>
            <p>
              If your order arrives damaged or you receive the wrong product, please contact us
              within 48 hours of delivery. Include your order number and photos of the issue in your
              email, and we&apos;ll arrange for a replacement to be sent to you at no additional cost. We&apos;re
              here to ensure your experience with KingJess is seamless.
            </p>
          </PolicySection>

          {/* Privacy and data */}
          <PolicySection title="Privacy and data" delay={0.25}>
            <p>
              KingJess covers the cost of return shipping for damaged or incorrect items. For other
              returns, the customer is responsible for return shipping fees unless otherwise
              stated during a promotional period. We recommend using a trackable shipping method
              to ensure your package reaches us safely.
            </p>
          </PolicySection>

          {/* Contact us */}
          <PolicySection title="Contact us" delay={0.3}>
            <p>
              If you have any questions about our return policy or need assistance, our team is here
              to help. Email us at support@skinclinic.com, and we&apos;ll respond within 24-48 hours. At
              KingJess, we&apos;re dedicated to making your skincare journey enjoyable, from purchase to
              glow.
            </p>
          </PolicySection>
        </div>
      </section>

      {/* Subscribe Section */}
      <FadeIn direction="up" duration={0.8}>
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
                <FadeIn direction="up" delay={0.1}>
                  <h2 className="text-3xl md:text-4xl font-normal text-white mb-4 tracking-tight leading-tight">
                    Subscribe for
                    <br />
                    exclusive deals
                  </h2>
                </FadeIn>
                <FadeIn direction="up" delay={0.2}>
                  <p className="text-white/90 text-sm md:text-base mb-8 leading-relaxed">
                    Get exclusive access to the latest natural skincare deals
                    <br className="hidden md:block" />
                    and tips delivered straight to your inbox!
                  </p>
                </FadeIn>

                {/* Email Form - Underline style */}
                <FadeIn direction="up" delay={0.3}>
                  <form onSubmit={handleSubscribe} className="w-full max-w-sm">
                    <div className="relative flex items-center border-b border-white/60">
                      <input
                        type="email"
                        id="terms-service-email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full py-3 bg-transparent text-white placeholder-white/70 text-sm
                                 focus:outline-none transition-all duration-300"
                        required
                      />
                      <button
                        type="submit"
                        className="text-white text-xl hover:translate-x-1 transition-transform duration-300"
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
      </FadeIn>
    </main>
  );
}

// Policy Section Component with animation
function PolicySection({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}): React.JSX.Element {
  return (
    <FadeIn direction="up" delay={delay}>
      <div className="border-t border-neutral-200 pt-8">
        <h2 className="text-lg text-black md:text-xl font-semibold mb-4 tracking-tight">
          {title}
        </h2>
        <div className="text-neutral-600 leading-relaxed text-sm md:text-base">
          {children}
        </div>
      </div>
    </FadeIn>
  );
}
