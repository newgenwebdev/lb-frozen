"use client";

import { useState } from "react";
import Link from "next/link";
import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import NewsletterFooter from "@/components/shared/NewsletterFooter";
import { useToast } from "@/components/ui/toast";

const BUSINESS_EMAIL = "lbfrozenweb@gmail.com";
const BUSINESS_PHONE = "03-62772009";
const BUSINESS_ADDRESS =
  "No 19 JLN TAGO 6, TMN PERINDUSTRIAN TAGO, SRI DAMANSARA, 52200 KL";

export default function ContactUsPage() {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    orderId: "",
    subject: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      showToast("Please fill in your name, email, and message.", "info");
      return;
    }

    setSubmitting(true);
    const subject = encodeURIComponent(
      form.subject || `New enquiry from ${form.name}`
    );
    const bodyLines = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      form.phone ? `Phone: ${form.phone}` : null,
      form.orderId ? `Order ID: ${form.orderId}` : null,
      "",
      form.message,
    ].filter(Boolean);
    const body = encodeURIComponent(bodyLines.join("\n"));

    window.location.href = `mailto:${BUSINESS_EMAIL}?subject=${subject}&body=${body}`;

    setTimeout(() => {
      showToast("Opening your email client...", "success");
      setSubmitting(false);
    }, 400);
  };

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
          <span className="text-gray-900 font-medium">Contact Us</span>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white px-4 lg:px-6 py-6 lg:py-10">
        <div className="relative rounded-3xl overflow-hidden bg-linear-to-br from-[#23429B] via-[#8B3A8F] to-[#C52129] p-8 lg:p-16 min-h-[240px] lg:min-h-[340px] flex items-center">
          <div
            className="hidden lg:block absolute rounded-full pointer-events-none"
            style={{
              width: "500px",
              height: "500px",
              top: "-150px",
              right: "-100px",
              border: "45px solid rgba(255, 255, 255, 0.12)",
              zIndex: 1,
            }}
          />
          <div
            className="hidden lg:block absolute rounded-full pointer-events-none"
            style={{
              width: "320px",
              height: "320px",
              top: "-50px",
              right: "0px",
              border: "35px solid rgba(255, 255, 255, 0.18)",
              zIndex: 1,
            }}
          />
          <div
            className="lg:hidden absolute rounded-full pointer-events-none"
            style={{
              width: "260px",
              height: "260px",
              top: "-80px",
              right: "-80px",
              border: "22px solid rgba(255, 255, 255, 0.12)",
              zIndex: 1,
            }}
          />

          <div className="relative z-10 max-w-2xl">
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs lg:text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              GET IN TOUCH
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              We&apos;re here to help
            </h1>
            <p className="text-white/90 text-sm sm:text-base lg:text-lg leading-relaxed">
              Have a question about our products, an order, or a wholesale
              enquiry? Reach out and our team will get back to you as soon as
              possible.
            </p>
          </div>
        </div>
      </div>

      {/* Contact info cards */}
      <div className="bg-white px-4 lg:px-6 pb-8 lg:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <a
            href={`mailto:${BUSINESS_EMAIL}`}
            className="bg-gray-50 rounded-2xl p-6 hover:shadow-md hover:bg-white hover:border-[#23429B]/30 border border-transparent transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#23429B] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
              Email Us
            </p>
            <p className="text-base lg:text-lg font-bold text-gray-900 break-all">
              {BUSINESS_EMAIL}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              We typically reply within 1 business day
            </p>
          </a>

          <a
            href={`tel:${BUSINESS_PHONE.replace(/[^0-9]/g, "")}`}
            className="bg-gray-50 rounded-2xl p-6 hover:shadow-md hover:bg-white hover:border-[#C52129]/30 border border-transparent transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#C52129] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <svg
                className="w-6 h-6 text-white"
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
            </div>
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
              Call Us
            </p>
            <p className="text-base lg:text-lg font-bold text-gray-900">
              {BUSINESS_PHONE}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Mon – Sat, business hours
            </p>
          </a>

          <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-md hover:bg-white hover:border-[#23429B]/30 border border-transparent transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#23429B] flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-white"
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
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
              Visit Us
            </p>
            <p className="text-sm lg:text-base font-bold text-gray-900 leading-snug">
              {BUSINESS_ADDRESS}
            </p>
          </div>
        </div>
      </div>

      {/* Form + Map */}
      <div className="bg-gray-50 py-10 lg:py-16">
        <div className="mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Form */}
            <div className="lg:col-span-3 bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-10 shadow-sm">
              <span className="inline-block text-[#C52129] text-xs lg:text-sm font-semibold tracking-wider uppercase mb-2">
                Send a Message
              </span>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">
                Drop us a line
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Name <span className="text-[#C52129]">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#23429B] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Email <span className="text-[#C52129]">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#23429B] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Phone
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="03-XXXXXXXX"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#23429B] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="orderId"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Order ID
                    </label>
                    <input
                      id="orderId"
                      name="orderId"
                      type="text"
                      value={form.orderId}
                      onChange={handleChange}
                      placeholder="If your enquiry is about an order"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#23429B] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Subject
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="What is this about?"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#23429B] focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Message <span className="text-[#C52129]">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us how we can help..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#23429B] focus:border-transparent resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto bg-[#23429B] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#1a3478] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    "Sending..."
                  ) : (
                    <>
                      Send Message
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
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Side info */}
            <div className="lg:col-span-2 space-y-4 lg:space-y-6">
              {/* Hours */}
              <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#23429B]/10 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#23429B]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Support Hours
                  </h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex justify-between">
                    <span>Monday – Friday</span>
                    <span className="font-medium text-gray-900">
                      9:00 – 18:00
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Saturday</span>
                    <span className="font-medium text-gray-900">
                      9:00 – 14:00
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Sunday</span>
                    <span className="font-medium text-gray-400">Closed</span>
                  </li>
                </ul>
              </div>

              {/* Map */}
              <div className="bg-white rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm">
                <div className="aspect-video lg:aspect-square w-full">
                  <iframe
                    title="LB Frozen Food location"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(
                      BUSINESS_ADDRESS
                    )}&output=embed`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="p-5">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    LB Frozen Food Marketing Sdn. Bhd.
                  </p>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                    {BUSINESS_ADDRESS}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      BUSINESS_ADDRESS
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#23429B] hover:text-[#1a3478]"
                  >
                    Get directions
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
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick FAQ / Help links */}
      <div className="bg-white py-10 lg:py-16">
        <div className="mx-auto px-4 lg:px-6">
          <div className="bg-linear-to-r from-[#C52129] to-[#23429B] rounded-2xl lg:rounded-3xl p-8 lg:p-12 text-white relative overflow-hidden">
            <div
              className="hidden lg:block absolute rounded-full pointer-events-none"
              style={{
                width: "400px",
                height: "400px",
                bottom: "-200px",
                right: "-100px",
                border: "40px solid rgba(255, 255, 255, 0.1)",
              }}
            />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">
                  Need quick answers?
                </h2>
                <p className="text-white/90 text-sm lg:text-base">
                  Check our help center for common questions about orders,
                  delivery, payment, and more.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 lg:justify-end">
                <Link
                  href="/help-support"
                  className="bg-white text-[#23429B] px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors text-sm lg:text-base text-center"
                >
                  Help Center
                </Link>
                <Link
                  href="/about-us"
                  className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-full font-semibold hover:bg-white/20 transition-colors text-sm lg:text-base text-center"
                >
                  About Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewsletterFooter />
    </div>
  );
}
