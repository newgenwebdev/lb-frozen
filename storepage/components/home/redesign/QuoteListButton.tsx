"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ClipboardList } from "lucide-react";
import { useQuoteListCount, useQuoteListStore } from "@/lib/stores";
import { SECTION_IDS, scrollToSection } from "./layout";

export default function QuoteListButton() {
  const t = useTranslations("HomeRedesign.quoteButton");
  const count = useQuoteListCount();

  // The quote list store skips automatic hydration; load the saved list once mounted
  useEffect(() => {
    useQuoteListStore.persist.rehydrate();
  }, []);

  return (
    <button
      type="button"
      onClick={() => scrollToSection(SECTION_IDS.quote)}
      aria-label={t("label", { count })}
      title={t("label", { count })}
      className="fixed bottom-5 right-5 lg:bottom-8 lg:right-8 z-40 w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-lb-navy text-white ring-2 ring-white shadow-lg shadow-lb-navy/30 flex items-center justify-center hover:bg-lb-navy-deep transition-colors cursor-pointer"
    >
      <ClipboardList className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={1.75} />
      <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1.5 rounded-full bg-lb-red text-white text-xs font-bold flex items-center justify-center border-2 border-lb-cream tabular-nums">
        {count}
      </span>
    </button>
  );
}
