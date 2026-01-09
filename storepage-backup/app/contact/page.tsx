"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";

export default function ContactUsPage(): React.JSX.Element {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    console.log("Form submitted:", formData);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative w-full h-[280px] sm:h-[320px] md:h-[360px] lg:h-[400px]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/homepage/contact-us.jpg')`,
          }}
        >
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        {/* Title */}
        <div className="relative z-10 h-full flex items-end">
          <div className="w-full max-w-7xl px-6 pb-12">
            <motion.h1
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-4xl md:text-5xl lg:text-6xl font-light text-white tracking-tight"
            >
              Contact us
            </motion.h1>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="w-full px-6 py-12 md:py-16 lg:py-20">
        <FadeIn direction="up" delay={0}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6 pb-12 md:pb-16 border-b border-neutral-100">
            <div className="md:col-span-3">
              <h2 className="font-semibold text-neutral-900 uppercase">
                Customer Care
              </h2>
            </div>

            {/* Contact Info */}
            <div className="md:col-span-9">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">
                {/* Left Column */}
                <FadeIn direction="up" delay={0.1}>
                  <div className="space-y-6">
                    {/* Customer Service */}
                    <div>
                      <p className=" text-neutral-400 mb-1">Customer service</p>
                      <a
                        href="mailto:support@example.com"
                        className="font-bold text-black hover:underline"
                      >
                        support@example.com
                      </a>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <p className=" text-neutral-400 mb-1">Phone number</p>
                      <a
                        href="tel:+12223334444"
                        className="font-bold  text-black hover:underline"
                      >
                        +1 222 333 4444
                      </a>
                    </div>
                  </div>
                </FadeIn>

                {/* Right Column */}
                <FadeIn direction="up" delay={0.15}>
                  <div className="space-y-6">
                    {/* Complaints */}
                    <div>
                      <p className=" text-neutral-400 mb-1">Complaints</p>
                      <a
                        href="mailto:info@example.com"
                        className="font-bold  text-black hover:underline"
                      >
                        info@example.com
                      </a>
                    </div>

                    {/* Working Hours */}
                    <div>
                      <p className="mb-1 text-neutral-400">Working hours</p>
                      <p className="font-bold text-black">Monday - Friday</p>
                      <p className="font-bold text-black">8am - 5pm</p>
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* General Inquiry */}
        <FadeIn direction="up" delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6 pt-7 md:pt-16">
            {/* Label */}
            <div className="md:col-span-3">
              <h2 className="font-semibold text-neutral-900 uppercase">
                General Inquiry
              </h2>
            </div>

            {/* Form */}
            <div className="md:col-span-9 lg:col-span-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* First Name */}
                <FadeIn direction="up" delay={0.15}>
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block font-bold mb-2 text-black"
                    >
                      First name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg
                               placeholder-neutral-400
                               focus:outline-none focus:border-neutral-400 transition-colors"
                    />
                  </div>
                </FadeIn>

                {/* Last Name */}
                <FadeIn direction="up" delay={0.2}>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block  font-bold mb-2 text-black"
                    >
                      Last name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg
                               placeholder-neutral-400 text-neutral-900
                               focus:outline-none focus:border-neutral-400 transition-colors"
                    />
                  </div>
                </FadeIn>

                {/* Email Address */}
                <FadeIn direction="up" delay={0.25}>
                  <div>
                    <label
                      htmlFor="email"
                      className="block font-bold mb-2 text-black"
                    >
                      Email address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="johndoe@example.com"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg
                               placeholder-neutral-400 text-neutral-900
                               focus:outline-none focus:border-neutral-400 transition-colors"
                    />
                  </div>
                </FadeIn>

                {/* Message */}
                <FadeIn direction="up" delay={0.3}>
                  <div>
                    <label
                      htmlFor="message"
                      className="block font-bold mb-2 text-black"
                    >
                      Your message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={5}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg
                               placeholder-neutral-400 text-neutral-900 resize-none
                               focus:outline-none focus:border-neutral-400 transition-colors"
                    />
                  </div>
                </FadeIn>

                {/* Submit Button */}
                <FadeIn direction="up" delay={0.35}>
                  <div className="pt-4">
                    <button
                      type="submit"
                      className="px-10  text-black cursor-pointer py-3 border border-neutral-900 rounded-full
                               font-semibold bg-white
                               hover:bg-neutral-900 hover:text-white transition-colors duration-300"
                    >
                      Submit
                    </button>
                  </div>
                </FadeIn>
              </form>
            </div>
          </div>
        </FadeIn>
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
                  <form className="w-full max-w-sm">
                    <div className="relative flex items-center border-b border-white/60">
                      <input
                        type="email"
                        id="contact-cta-email"
                        name="email"
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
