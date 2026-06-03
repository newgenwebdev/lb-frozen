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

const deliveryItems: FAQItem[] = [
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

export default function DeliveryDetailsPage(): React.JSX.Element {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string): void => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ProtectedNavbar />

      <div className="bg-white px-4 lg:px-6 pt-4">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Delivery Details" }]}
        />
      </div>

      <div className="bg-white px-4 lg:px-6 py-10 lg:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#C52129] text-sm font-semibold tracking-wider uppercase mb-3">
            Shipping
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
            Delivery Details
          </h1>
          <p className="text-sm text-gray-500">配送详情</p>
        </div>
      </div>

      <div className="px-4 lg:px-6 py-10 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="divide-y divide-gray-200">
            {deliveryItems.map((item, idx) => {
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
