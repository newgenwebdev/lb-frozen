"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import NewsletterFooter from "@/components/shared/NewsletterFooter";
import Breadcrumb from "@/components/shared/Breadcrumb";

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

const refundItems: FAQItem[] = [
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
];

function renderAnswer(content: AnswerContent): React.JSX.Element {
  switch (content.type) {
    case "paragraph":
      return <p className="text-sm text-gray-600 leading-relaxed">{content.text}</p>;
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

export default function RefundPolicyPage(): React.JSX.Element {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string): void => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ProtectedNavbar />

      <div className="bg-white px-4 lg:px-6 pt-4">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Refund Policy" }]}
        />
      </div>

      <div className="bg-white px-4 lg:px-6 py-10 lg:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#C52129] text-sm font-semibold tracking-wider uppercase mb-3">
            Returns
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
            Refund Policy
          </h1>
          <p className="text-sm text-gray-500">退款政策</p>
        </div>
      </div>

      <div className="px-4 lg:px-6 py-10 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="divide-y divide-gray-200">
            {refundItems.map((item, idx) => {
              const key = `${idx}`;
              const isOpen = openKey === key;

              return (
                <div key={key}>
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

                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pb-5">
                        <div lang="en">{renderAnswer(item.answer.en)}</div>
                        <div className="border-t border-gray-200 my-3" />
                        <div lang="zh-CN">{renderAnswer(item.answer.zh)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <NewsletterFooter />
    </div>
  );
}
