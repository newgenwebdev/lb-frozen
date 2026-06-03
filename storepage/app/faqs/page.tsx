"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import NewsletterFooter from "@/components/shared/NewsletterFooter";
import Breadcrumb from "@/components/shared/Breadcrumb";

// --- Types ---

type ParagraphAnswer = { type: "paragraph"; text: string };
type NumberedListAnswer = { type: "numbered"; items: string[] };
type BulletListAnswer = { type: "bullet"; items: string[] };
type MixedAnswer = { type: "mixed"; intro?: string; items: string[]; outro?: string };
type AnswerContent = ParagraphAnswer | NumberedListAnswer | BulletListAnswer | MixedAnswer;

type FAQItem = {
  questionEn: string;
  questionZh: string;
  answer: { en: AnswerContent; zh: AnswerContent };
};

type FAQSection = {
  title: string;
  items: FAQItem[];
};

// --- FAQ Data ---

const faqData: FAQSection[] = [
  {
    title: "General",
    items: [
      {
        questionEn: "How do you ensure frozen food stays in good condition?",
        questionZh: "如何确保购买的冷冻食品保持良好状态？",
        answer: {
          en: {
            type: "paragraph",
            text: "All products are stored in temperature-controlled freezer facilities. During delivery, we use insulated bags to keep the products at the proper temperature.",
          },
          zh: {
            type: "paragraph",
            text: "我们的产品都会储存在严格控温的冷冻仓库中。配送时也会使用特别设计的保温袋，确保产品在运输过程中保持最佳温度。",
          },
        },
      },
      {
        questionEn: "How should I store the products?",
        questionZh: "产品应该如何保存？",
        answer: {
          en: {
            type: "paragraph",
            text: "Simply keep the products in your refrigerator's chiller or freezer compartment.",
          },
          zh: {
            type: "paragraph",
            text: "我们的产品方便储存，只需放入家里的冷冻冰箱即可。",
          },
        },
      },
      {
        questionEn: "What if the product I want is out of stock?",
        questionZh: "想买的产品缺货了怎么办？",
        answer: {
          en: {
            type: "paragraph",
            text: "Please contact our customer service team. We will notify you once the product is available again.",
          },
          zh: {
            type: "paragraph",
            text: "请联络我们的客服，我们会在产品补货后通知您。",
          },
        },
      },
      {
        questionEn: "What is your Privacy Policy?",
        questionZh: "隐私政策是什么？",
        answer: {
          en: {
            type: "paragraph",
            text: "We value your personal information and keep all data secure and encrypted to protect it from unauthorized access.",
          },
          zh: {
            type: "paragraph",
            text: "我们非常重视您的个人资料安全。所有资料都会经过加密并妥善保存，以防止外泄或被盗取。",
          },
        },
      },
      {
        questionEn: "There was an error during checkout. How can I confirm my order?",
        questionZh: "结账时出现错误，怎么确认订单是否成功？",
        answer: {
          en: {
            type: "numbered",
            items: [
              "Log in to your account to check your order status.",
              "You will receive an email confirmation once your order is successful.",
              "If payment was deducted but the order is not confirmed, please contact your bank or our customer service.",
            ],
          },
          zh: {
            type: "numbered",
            items: [
              "登录账号查看订单状态。",
              "成功下单后会收到电子邮件通知。",
              "如果银行卡已扣款但订单未确认，请联系银行或客服。",
            ],
          },
        },
      },
    ],
  },
  {
    title: "Payment",
    items: [
      {
        questionEn: "What payment methods do you accept?",
        questionZh: "接受哪些付款方式？",
        answer: {
          en: {
            type: "mixed",
            intro: "We accept payments in Malaysia Ringgit (MYR) via:",
            items: [
              "Visa / MasterCard",
              "FPX Online Banking (supports all banks)",
              "Touch 'n Go",
            ],
          },
          zh: {
            type: "mixed",
            intro: "所有付款以马币（MYR）进行，支持：",
            items: [
              "Visa / MasterCard",
              "FPX 网上银行转账（支持所有银行）",
              "Touch 'n Go",
            ],
          },
        },
      },
      {
        questionEn: "Why was my payment unsuccessful?",
        questionZh: "为什么付款失败？",
        answer: {
          en: {
            type: "mixed",
            intro: "Possible reasons include:",
            items: [
              "Expired credit card",
              "Insufficient balance or credit limit exceeded",
              "Incorrect payment information entered",
            ],
            outro: "Please check your payment details or contact your bank for assistance.",
          },
          zh: {
            type: "mixed",
            intro: "可能原因：",
            items: [
              "信用卡已过期",
              "余额不足或超出信用额度",
              "输入资料错误",
            ],
            outro: "请确认付款资料正确或联系银行。",
          },
        },
      },
    ],
  },
];

// --- Answer renderer ---

function renderAnswer(content: AnswerContent): React.JSX.Element {
  switch (content.type) {
    case "paragraph":
      return (
        <p className="text-sm text-gray-600 leading-relaxed">{content.text}</p>
      );
    case "numbered":
      return (
        <ol className="space-y-1.5 text-sm text-gray-600 leading-relaxed list-decimal list-inside">
          {content.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "bullet":
      return (
        <ul className="space-y-1.5 text-sm text-gray-600 leading-relaxed list-disc list-inside">
          {content.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "mixed":
      return (
        <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
          {content.intro && <p>{content.intro}</p>}
          <ul className="space-y-1.5 list-disc list-inside">
            {content.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          {content.outro && <p>{content.outro}</p>}
        </div>
      );
  }
}

// --- Page ---

export default function FaqsPage(): React.JSX.Element {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string): void => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ProtectedNavbar />

      {/* Breadcrumb */}
      <div className="bg-white px-4 lg:px-6 pt-4">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
        />
      </div>

      {/* Hero */}
      <div className="bg-white px-4 lg:px-6 py-10 lg:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#C52129] text-sm font-semibold tracking-wider uppercase mb-3">
            FAQ
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-gray-500">常见问题解答</p>
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="px-4 lg:px-6 py-10 lg:py-16">
        <div className="max-w-3xl mx-auto space-y-10">
          {faqData.map((section, sectionIdx) => (
            <div key={section.title}>
              {/* Section header */}
              <p className="text-xs font-medium tracking-wide text-gray-900 uppercase mb-4 pb-3 border-b border-gray-200">
                {section.title}
              </p>

              {/* Accordion items */}
              <div className="divide-y divide-gray-200">
                {section.items.map((item, itemIdx) => {
                  const key = `${sectionIdx}-${itemIdx}`;
                  const isOpen = openKey === key;

                  return (
                    <div key={key}>
                      {/* Trigger */}
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        className="w-full flex items-start justify-between gap-4 py-4 text-left cursor-pointer"
                        aria-expanded={isOpen}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {item.questionEn}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {item.questionZh}
                          </p>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform duration-300 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Body: grid-rows accordion */}
                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="pb-5">
                            {/* EN answer */}
                            <div lang="en">{renderAnswer(item.answer.en)}</div>

                            {/* Divider */}
                            <div className="border-t border-gray-200 my-3" />

                            {/* ZH answer */}
                            <div lang="zh-CN">
                              {renderAnswer(item.answer.zh)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <NewsletterFooter />
    </div>
  );
}
