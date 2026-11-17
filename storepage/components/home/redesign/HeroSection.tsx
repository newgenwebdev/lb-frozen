"use client";

import { useTranslations } from "next-intl";
import { Layers, Move, ShieldCheck, Truck } from "lucide-react";
import { COMPANY } from "@/lib/data/company";
import { CONTAINER, SECTION_IDS, scrollToSection } from "./layout";

const FEATURES = [
  { key: "coldChain", Icon: Move },
  { key: "onTime", Icon: Truck },
  { key: "both", Icon: Layers },
  { key: "certified", Icon: ShieldCheck },
] as const;

const NOTES = ["minOrder", "noMinimum", "sameDay"] as const;

export default function HeroSection() {
  const t = useTranslations("HomeRedesign.hero");

  return (
    <section id={SECTION_IDS.top} className="scroll-mt-20 bg-lb-navy text-white">
      <div
        className={`${CONTAINER} grid gap-12 py-14 lg:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:items-center`}
      >
        {/* Copy */}
        <div>
          <p className="text-sm text-white/80 mb-6">
            <span className="font-semibold text-lb-red">{t("wholesale")}</span>{" "}
            {t("wholesaleText")}
            <span className="mx-2 text-lb-red">•</span>
            <span className="font-semibold text-lb-red">{t("retail")}</span>{" "}
            {t("retailText")}
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
          </h1>

          <p className="mt-5 text-base lg:text-xl font-bold tracking-wide uppercase text-lb-sky">
            {COMPANY.registeredName}
          </p>

          <p className="mt-6 max-w-xl text-base lg:text-lg leading-relaxed text-white/85">
            {t("intro")}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => scrollToSection(SECTION_IDS.quote)}
              className="h-14 px-8 bg-lb-red hover:bg-lb-red-dark text-white font-medium transition-colors cursor-pointer"
            >
              {t("ctaQuote")}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(SECTION_IDS.products)}
              className="h-14 px-8 border border-white/40 hover:border-white text-white font-medium transition-colors cursor-pointer"
            >
              {t("ctaProducts")}
            </button>
          </div>

          <ul className="mt-8 flex flex-col gap-y-2 text-sm text-white/60 sm:flex-row sm:flex-wrap">
            {NOTES.map((key, index) => (
              <li key={key} className="flex items-center">
                {index > 0 && (
                  <span className="hidden sm:block mx-3 h-3.5 w-px bg-white/30" aria-hidden />
                )}
                {t(`notes.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* Feature grid */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 border-t border-l border-lb-navy-line">
          {FEATURES.map(({ key, Icon }) => (
            <li
              key={key}
              className="border-r border-b border-lb-navy-line p-7 lg:p-8"
            >
              <Icon className="w-8 h-8 text-lb-sky" strokeWidth={1.5} />
              <h3 className="mt-6 text-lg font-bold">{t(`features.${key}.title`)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                {t(`features.${key}.description`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
