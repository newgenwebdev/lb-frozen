"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";

// FAQ Data
const faqData = {
  orders: {
    title: "ORDERS",
    items: [
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept credit/debit cards, PayPal, and Apple Pay for a seamless checkout experience.",
      },
      {
        question: "Can I modify my order after placing it?",
        answer:
          "You can modify your order within 1 hour of placing it by contacting our customer support team. After this window, we may have already begun processing your order.",
      },
      {
        question: "How do I cancel my order?",
        answer:
          "To cancel your order, please contact us immediately at support@example.com. If your order hasn't been shipped yet, we'll process the cancellation and issue a full refund.",
      },
      {
        question: "Is my payment information secure?",
        answer:
          "Yes, we use industry-standard SSL encryption to protect your payment information. We never store your full credit card details on our servers.",
      },
      {
        question: "Can I place an order over the phone?",
        answer:
          "Yes, you can place an order by calling our customer service line at +1 222 333 4444 during business hours (Monday-Friday, 8am-5pm).",
      },
    ],
  },
  shipping: {
    title: "SHIPPING",
    items: [
      {
        question: "How long does shipping take?",
        answer:
          "Standard shipping takes 5-7 business days. Express shipping is available for 2-3 business day delivery. International shipping may take 10-14 business days.",
      },
      {
        question: "How much does shipping cost?",
        answer:
          "Shipping is free for orders over $50. For orders under $50, standard shipping costs $5.99 and express shipping costs $12.99.",
      },
      {
        question: "Do you ship internationally?",
        answer:
          "Yes, we ship to over 50 countries worldwide. International shipping rates and delivery times vary by location. You can see the exact cost at checkout.",
      },
      {
        question: "Can I track my order?",
        answer:
          "Yes, once your order ships, you'll receive an email with a tracking number. You can use this to track your package on our website or the carrier's site.",
      },
      {
        question: "What if my order arrives damaged?",
        answer:
          "If your order arrives damaged, please contact us within 48 hours with photos of the damage. We'll arrange a replacement or full refund at no extra cost.",
      },
    ],
  },
  returns: {
    title: "RETURNS & REFUNDS",
    items: [
      {
        question: "What is your return policy?",
        answer:
          "We offer a 30-day return policy for unused, unopened products in their original packaging. Items purchased during sales are also eligible for returns.",
      },
      {
        question: "How do I return a product?",
        answer:
          "To initiate a return, email us at support@example.com with your order number. We'll provide a return label and instructions for sending back your item.",
      },
      {
        question: "When will I receive my refund?",
        answer:
          "Once we receive and inspect your return, refunds are processed within 5-7 business days. The amount will be credited to your original payment method.",
      },
      {
        question: "Can I return a used product?",
        answer:
          "Unfortunately, we cannot accept returns on used or opened products due to hygiene and safety standards. Please contact us if you received a defective item.",
      },
      {
        question: "What if I'm not satisfied with my purchase?",
        answer:
          "Your satisfaction is our priority. If you're not happy with your purchase, contact us and we'll work with you to find a solution, whether it's an exchange or refund.",
      },
    ],
  },
};

export default function FAQPage(): React.JSX.Element {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(["orders-0"]));

  const toggleItem = (id: string): void => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] mt-14">
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-3xl md:text-4xl font-semibold text-black mb-12 tracking-tight"
        >
          Frequently asked questions
        </motion.h1>

        {/* FAQ Sections */}
        <div className="space-y-10">
          {/* Orders Section */}
          <FAQSection
            title={faqData.orders.title}
            items={faqData.orders.items}
            sectionKey="orders"
            openItems={openItems}
            onToggle={toggleItem}
            delay={0}
          />

          {/* Shipping Section */}
          <FAQSection
            title={faqData.shipping.title}
            items={faqData.shipping.items}
            sectionKey="shipping"
            openItems={openItems}
            onToggle={toggleItem}
            delay={0.1}
          />

          {/* Returns & Refunds Section */}
          <FAQSection
            title={faqData.returns.title}
            items={faqData.returns.items}
            sectionKey="returns"
            openItems={openItems}
            onToggle={toggleItem}
            delay={0.2}
          />
        </div>
      </div>

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
                        id="faqs-email"
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

// FAQ Section Component with animation
function FAQSection({
  title,
  items,
  sectionKey,
  openItems,
  onToggle,
  delay = 0,
}: {
  title: string;
  items: { question: string; answer: string }[];
  sectionKey: string;
  openItems: Set<string>;
  onToggle: (id: string) => void;
  delay?: number;
}): React.JSX.Element {
  return (
    <FadeIn direction="up" delay={delay}>
      <div>
        {/* Section Title */}
        <h2 className="font-medium tracking-wide text-black uppercase mb-4">
          {title}
        </h2>

        {/* Accordion Items */}
        <div className="border-t border-neutral-200">
          {items.map((item, index) => {
            const itemId = `${sectionKey}-${index}`;
            const isOpen = openItems.has(itemId);

            return (
              <AccordionItem
                key={itemId}
                question={item.question}
                answer={item.answer}
                isOpen={isOpen}
                onToggle={() => onToggle(itemId)}
                index={index}
              />
            );
          })}
        </div>
      </div>
    </FadeIn>
  );
}

// Accordion Item Component with animation
function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
  index,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="border-b border-neutral-200"
    >
      {/* Question Button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left
                   hover:opacity-70 transition-opacity"
        aria-expanded={isOpen}
      >
        <span className="cursor-pointer text-sm md:text-black font-semibold pr-4">
          {question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="cursor-pointer text-black text-xl shrink-0 w-6 h-6 flex items-center justify-center"
        >
          +
        </motion.span>
      </button>

      {/* Answer with AnimatePresence */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm text-neutral-500 pb-4 pr-10 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
