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
  {
    title: "Delivery",
    items: [
      {
        questionEn: "How long does delivery take?",
        questionZh: "配送需要多久？",
        answer: {
          en: {
            type: "mixed",
            items: [
              "Standard Delivery: 1–3 working days (Free delivery for Klang Valley orders above RM150)",
              "Peak Period: 2–5 working days",
              "Wholesale Delivery: 1–5 working days (Free delivery for orders above RM500)",
            ],
            outro: "If your area is outside our delivery coverage, please contact us for assistance.",
          },
          zh: {
            type: "mixed",
            items: [
              "普通配送：1–3 个工作天（Klang Valley 满 RM80 免运费）",
              "高峰期：2–5 个工作天",
              "批发配送：1–5 个工作天（满 RM300 免运费）",
            ],
            outro: "若不在配送范围，可联系客服安排。",
          },
        },
      },
      {
        questionEn: "What if I'm not available during delivery?",
        questionZh: "送货时我不在怎么办？",
        answer: {
          en: {
            type: "paragraph",
            text: "Please ensure someone is available during the selected delivery time. Our delivery team will attempt to contact you 3 times. If unsuccessful, the items will be returned to the warehouse. Re-delivery charges may apply.",
          },
          zh: {
            type: "paragraph",
            text: "建议您在选择的时间内在场。配送员会尝试联系您 3 次，若无人接听，货物将退回仓库。重新配送需额外收费。",
          },
        },
      },
    ],
  },
  {
    title: "Returns & Refunds",
    items: [
      {
        questionEn: "Can I cancel my order?",
        questionZh: "可以取消订单吗？",
        answer: {
          en: {
            type: "paragraph",
            text: "Yes, confirmed orders can be cancelled within 2 hours. Please email us with the reason for cancellation. Once approved, store credit of the same value will be credited to your account.",
          },
          zh: {
            type: "paragraph",
            text: "可以，订单确认后 2 小时内可取消。请发送电邮并说明取消原因。确认后，将以 Store Credit 方式退回相同金额。",
          },
        },
      },
      {
        questionEn: "Can I return the products?",
        questionZh: "可以退货吗？",
        answer: {
          en: {
            type: "paragraph",
            text: "Returns are generally not accepted once goods are received. Please check your items upon delivery. If the products are defective or expired, kindly contact our customer service.",
          },
          zh: {
            type: "paragraph",
            text: "一般情况下不接受退货。请在收货时检查商品。若产品有损坏或过期，可联系客服处理。",
          },
        },
      },
      {
        questionEn: "Can I exchange items if I ordered the wrong products?",
        questionZh: "收到后才发现买错商品，可以换货吗？",
        answer: {
          en: {
            type: "paragraph",
            text: "Unfortunately, items sold are not exchangeable. Please review your order carefully before checkout.",
          },
          zh: {
            type: "paragraph",
            text: "很抱歉，商品售出后不能更换。请在付款前确认订单内容。",
          },
        },
      },
      {
        questionEn: "Can I get a cash refund?",
        questionZh: "可以现金退款吗？",
        answer: {
          en: {
            type: "paragraph",
            text: "Orders are not eligible for cash refunds unless stated otherwise.",
          },
          zh: {
            type: "paragraph",
            text: "除特别情况外，订单不提供现金退款。",
          },
        },
      },
      {
        questionEn: "I received defective or incorrect items. What should I do?",
        questionZh: "收到错误或损坏商品怎么办？",
        answer: {
          en: {
            type: "mixed",
            intro: "The following are NOT considered defects:",
            items: [
              "Slight color differences from website images",
              "Minor measurement differences",
              "Small cracks or slight shape imperfections",
              "Damage caused by misuse",
            ],
            outro:
              "If your issue does not fall under the above, please take a photo of the item and contact our customer service. Replacement or credit voucher will be provided if the item is confirmed defective or incorrect.",
          },
          zh: {
            type: "mixed",
            intro: "以下情况不属于产品损坏：",
            items: [
              "图片与实物轻微色差",
              "尺寸轻微误差",
              "小裂痕或轻微变形",
              "人为损坏",
            ],
            outro:
              "若不属于以上情况，请拍下问题商品并联系客服，我们会安排后续处理。若确认有问题，可更换商品或提供 Credit Voucher。",
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
