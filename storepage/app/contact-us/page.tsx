"use client";

import { useState } from "react";
import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import NewsletterFooter from "@/components/shared/NewsletterFooter";
import { useToast } from "@/components/ui/toast";
import Breadcrumb from "@/components/shared/Breadcrumb";
import {
  Send,
  Phone,
  Mail,
  Home,
  ArrowRight,
  MessageCircle,
  Copy,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

  const inputClass =
    "w-full px-4 py-3 bg-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#23429B]";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen bg-white">
      <ProtectedNavbar />

      <div className="mx-auto px-4 lg:px-6 pt-4 lg:pt-6">
        <Breadcrumb
          className="flex items-center gap-2 text-xs sm:text-sm text-gray-600"
          items={[
            { label: "Home", href: "/" },
            { label: "Contact Us" },
          ]}
        />
      </div>

      {/* Hero */}
      <div className="px-4 lg:px-6 py-10 lg:py-16 text-center">
        <p className="text-[#C52129] text-sm font-semibold tracking-wider uppercase mb-3">
          Contact Us
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight max-w-3xl mx-auto">
          Get In Touch With Us For Further Information.
        </h1>
      </div>

      {/* Form + Map */}
      <div className="px-4 lg:px-6 pb-12 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className={labelClass}>
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your Full Name"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className={labelClass}>
                  Your Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+60"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="orderId" className={labelClass}>
                  Order ID
                </label>
                <input
                  id="orderId"
                  name="orderId"
                  type="text"
                  value={form.orderId}
                  onChange={handleChange}
                  placeholder="If your enquiry is about an order"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="subject" className={labelClass}>
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                value={form.subject}
                onChange={handleChange}
                placeholder="What is this about?"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="message" className={labelClass}>
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                value={form.message}
                onChange={handleChange}
                placeholder="Tell us how we can help"
                className={`${inputClass} resize-none`}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-[#C52129] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#a51b22] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Sending..." : "Send Message"}
              {!submitting && <Send className="w-4 h-4" />}
            </button>
          </form>

          <div className="space-y-4 lg:space-y-0">
            {/* Support Hours — inline on mobile/tablet, overlay on lg+ */}
            <div className="rounded-2xl bg-linear-to-b from-[#C52129] via-[#8B3A8F] to-[#23429B] p-5 text-white shadow-xl lg:hidden">
              <h3 className="text-lg font-bold mb-3">Support Hours</h3>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center pb-2.5 border-b border-white/20">
                  <span className="text-sm">Monday – Friday</span>
                  <span className="text-sm font-medium">9:00 – 18:00</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-white/20">
                  <span className="text-sm">Saturday</span>
                  <span className="text-sm font-medium">9:00 – 14:00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Sunday</span>
                  <span className="text-sm font-medium">Closed</span>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="relative aspect-video lg:aspect-auto lg:h-[420px] w-full">
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
                <div className="hidden lg:block absolute top-4 right-4 w-72 rounded-2xl bg-linear-to-b from-[#C52129] via-[#8B3A8F] to-[#23429B] p-5 text-white shadow-xl">
                  <h3 className="text-lg font-bold mb-3">Support Hours</h3>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center pb-2.5 border-b border-white/20">
                      <span className="text-sm">Monday – Friday</span>
                      <span className="text-sm font-medium">9:00 – 18:00</span>
                    </div>
                    <div className="flex justify-between items-center pb-2.5 border-b border-white/20">
                      <span className="text-sm">Saturday</span>
                      <span className="text-sm font-medium">9:00 – 14:00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sunday</span>
                      <span className="text-sm font-medium">Closed</span>
                    </div>
                  </div>
                </div>
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
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact info cards */}
      <div className="px-4 lg:px-6 pb-12 lg:pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="bg-gray-50 rounded-2xl p-8 text-center hover:shadow-md transition-shadow w-full"
              >
                <div className="w-14 h-14 rounded-full bg-[#C52129] flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <p className="text-lg font-bold text-gray-900 mb-3">
                  Call & WhatsApp
                </p>
                <p className="text-sm text-gray-600">{BUSINESS_PHONE}</p>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="center">
              <a
                href={`tel:${BUSINESS_PHONE.replace(/[^0-9]/g, "")}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#C52129] flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">Call</span>
              </a>
              <a
                href={`https://wa.me/6${BUSINESS_PHONE.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  WhatsApp
                </span>
              </a>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="bg-gray-50 rounded-2xl p-8 text-center hover:shadow-md transition-shadow w-full"
              >
                <div className="w-14 h-14 rounded-full bg-[#23429B] flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <p className="text-lg font-bold text-gray-900 mb-3">Email Us</p>
                <p className="text-sm text-gray-600 break-all">
                  {BUSINESS_EMAIL}
                </p>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="center">
              <a
                href={`mailto:${BUSINESS_EMAIL}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#23429B] flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  Mail App
                </span>
              </a>
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${BUSINESS_EMAIL}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#EA4335] flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">Gmail</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(BUSINESS_EMAIL);
                  showToast("Email copied to clipboard", "success");
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 transition-colors w-full text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Copy className="w-4 h-4 text-gray-700" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  Copy email
                </span>
              </button>
            </PopoverContent>
          </Popover>

          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#C52129] flex items-center justify-center mx-auto mb-4">
              <Home className="w-6 h-6 text-white" />
            </div>
            <p className="text-lg font-bold text-gray-900 mb-3">Address</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {BUSINESS_ADDRESS}
            </p>
          </div>
        </div>
      </div>

      <NewsletterFooter />
    </div>
  );
}
