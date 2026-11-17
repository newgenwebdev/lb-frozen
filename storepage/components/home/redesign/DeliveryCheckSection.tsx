"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { whatsappUrl } from "@/lib/data/company";
import {
  DELIVERY_AREAS,
  ZONE_PRICES,
  findDeliveryArea,
  type ZoneKey,
} from "@/lib/data/deliveryZones";
import SectionHeader from "./SectionHeader";
import { CONTAINER, SECTION_IDS } from "./layout";

const ZONES: ZoneKey[] = ["A", "B", "C"];

// Visual accent per fee tier, built only from the project's existing color tokens
// (lb-sky / lb-navy / lb-red) — no new colors introduced.
const TIER_STYLES: Record<
  ZoneKey,
  { dot: string; card: string; chip: string; chipActive: string; panel: string }
> = {
  A: {
    dot: "bg-lb-sky",
    card: "border-t-4 border-t-lb-sky",
    chip: "border-lb-sky/50 bg-lb-sky/10 text-lb-navy",
    chipActive: "border-lb-sky bg-lb-sky text-lb-navy",
    panel: "border-lb-sky bg-lb-sky/10",
  },
  B: {
    dot: "bg-lb-navy",
    card: "border-t-4 border-t-lb-navy",
    chip: "border-lb-navy/30 bg-lb-navy/5 text-lb-navy",
    chipActive: "border-lb-navy bg-lb-navy text-white",
    panel: "border-lb-navy bg-lb-navy/5",
  },
  C: {
    dot: "bg-lb-red",
    card: "border-t-4 border-t-lb-red",
    chip: "border-lb-red/30 bg-lb-red/5 text-lb-red-dark",
    chipActive: "border-lb-red bg-lb-red text-white",
    panel: "border-lb-red bg-lb-red/5",
  },
};

export default function DeliveryCheckSection() {
  const t = useTranslations("HomeRedesign.deliveryCheck");
  const [query, setQuery] = useState("");
  // A match found while typing is shown immediately; a "not found" state only
  // appears once the user actually submits, so we don't flash an error on
  // every keystroke before a full area name has been typed.
  const [hasSearched, setHasSearched] = useState(false);

  const trimmed = query.trim();
  const match = trimmed ? findDeliveryArea(trimmed) : undefined;
  const showResult = trimmed.length > 0 && (!!match || hasSearched);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (!value.trim()) setHasSearched(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHasSearched(true);
  };

  return (
    <section
      id={SECTION_IDS.deliveryCheck}
      className="scroll-mt-20 bg-lb-paper py-16 lg:py-24"
    >
      <div className={CONTAINER}>
        <SectionHeader title={t("title")} description={t("description")} />

        <p className="mb-10 max-w-2xl text-base leading-relaxed text-lb-muted">
          {t("intro")}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mb-6 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="delivery-check-input" className="sr-only">
            {t("searchLabel")}
          </label>
          <input
            id="delivery-check-input"
            type="text"
            value={query}
            onChange={handleChange}
            placeholder={t("searchPlaceholder")}
            className="h-14 flex-1 border border-lb-line bg-white px-5 text-base text-lb-navy outline-none transition-colors placeholder:text-lb-muted/70 focus:border-lb-navy"
          />
          <button
            type="submit"
            className="h-14 shrink-0 cursor-pointer bg-lb-red px-8 text-base font-medium text-white transition-colors hover:bg-lb-red-dark"
          >
            {t("searchButton")}
          </button>
        </form>

        {showResult && (
          <div aria-live="polite" className="mb-12 max-w-xl">
            {match ? (
              <div className={`border px-6 py-5 ${TIER_STYLES[match.zone].panel}`}>
                <p className="text-sm text-lb-muted">
                  {t("result.foundLabel", { area: match.name })}
                </p>
                <p className="mt-1 text-2xl font-black text-lb-navy">
                  {t("result.foundPrice", { price: ZONE_PRICES[match.zone] / 100 })}
                </p>
              </div>
            ) : (
              <div className="border border-lb-line bg-white px-6 py-5">
                <p className="text-base font-bold text-lb-navy">
                  {t("result.notFoundTitle")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-lb-muted">
                  {t("result.notFoundBody")}
                </p>
                <a
                  href={whatsappUrl(t("result.notFoundMessage", { area: trimmed }))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex h-11 items-center border border-lb-navy px-5 text-sm font-medium text-lb-navy transition-colors hover:bg-lb-navy hover:text-white"
                >
                  {t("result.notFoundCta")}
                </a>
              </div>
            )}
          </div>
        )}

        <div className="mb-12 grid gap-6 sm:grid-cols-3 lg:mb-16">
          {ZONES.map((zone) => {
            const count = DELIVERY_AREAS.filter((a) => a.zone === zone).length;
            const price = ZONE_PRICES[zone] / 100;
            return (
              <div
                key={zone}
                className={`border border-lb-line bg-white px-6 py-6 ${TIER_STYLES[zone].card}`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full ${TIER_STYLES[zone].dot}`}
                  aria-hidden
                />
                <p className="mt-4 text-3xl font-black text-lb-navy">RM{price}</p>
                <p className="mt-2 text-sm text-lb-muted">
                  {t("tiers.areaCount", { count })}
                </p>
              </div>
            );
          })}
        </div>

        <div className="space-y-8">
          {ZONES.map((zone) => {
            const areas = DELIVERY_AREAS.filter((a) => a.zone === zone);
            const price = ZONE_PRICES[zone] / 100;
            return (
              <div key={zone}>
                <h3 className="mb-4 text-base font-bold text-lb-navy">
                  {t("tiers.groupTitle", { price, count: areas.length })}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {areas.map((area) => (
                    <li
                      key={area.name}
                      className={`border px-3 py-1.5 text-sm transition-colors ${
                        match?.name === area.name
                          ? TIER_STYLES[zone].chipActive
                          : TIER_STYLES[zone].chip
                      }`}
                    >
                      {area.name}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-12 border-t border-lb-line pt-6 text-xs leading-relaxed text-lb-muted">
          {t("disclaimer")}
        </p>
      </div>
    </section>
  );
}
