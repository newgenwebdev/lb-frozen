"use client";

import { useTranslations } from "next-intl";
import { Check, Plus } from "lucide-react";
import { PRODUCT_RANGE } from "@/lib/data/productRange";
import { useQuoteListStore } from "@/lib/stores";
import SectionHeader from "./SectionHeader";
import { CONTAINER, SECTION_IDS } from "./layout";

export default function ProductRangeSection() {
  const t = useTranslations("HomeRedesign.products");
  const categories = useQuoteListStore((state) => state.categories);
  const toggle = useQuoteListStore((state) => state.toggle);

  return (
    <section id={SECTION_IDS.products} className="scroll-mt-20 py-16 lg:py-24">
      <div className={CONTAINER}>
        <SectionHeader title={t("title")} description={t("description")} />

        <ul>
          {PRODUCT_RANGE.map(({ key, temperature }) => {
            const isAdded = categories.includes(key);
            return (
              <li
                key={key}
                className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 gap-y-3 py-7 lg:py-9 border-b border-lb-line first:border-t md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1.3fr)_auto] md:gap-x-8 md:items-start"
              >
                <span className="text-2xl lg:text-3xl font-bold tabular-nums text-lb-navy">
                  {temperature}
                </span>

                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-lb-navy">
                    {t(`items.${key}.name`)}
                  </h3>
                  <p className="mt-1.5 text-sm tracking-wide text-lb-muted/80">
                    {t(`items.${key}.subtitle`)}
                  </p>
                </div>

                <p className="col-start-2 text-base leading-relaxed text-lb-muted md:col-start-auto">
                  {t(`items.${key}.examples`)}
                </p>

                <button
                  type="button"
                  onClick={() => toggle(key)}
                  aria-pressed={isAdded}
                  className={`col-start-2 justify-self-start h-11 px-5 border text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer md:col-start-auto ${
                    isAdded
                      ? "bg-lb-navy border-lb-navy text-white"
                      : "bg-transparent border-lb-navy text-lb-navy hover:bg-lb-navy hover:text-white"
                  }`}
                >
                  {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isAdded ? t("added") : t("add")}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
