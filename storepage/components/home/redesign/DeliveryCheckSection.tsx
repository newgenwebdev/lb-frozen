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
import { useDeliveryZonePricesQuery } from "@/lib/queries";
import SectionHeader from "./SectionHeader";
import { CONTAINER, SECTION_IDS } from "./layout";

const ZONES: ZoneKey[] = ["A", "B", "C"];

// The live Medusa shipping options are named "Klang Valley Zone A/B/C" (see
// server/src/scripts/setup-shipping-zones.ts) and carry no zone-letter field
// of their own, so we match on this substring.
const ZONE_NAME_FRAGMENT: Record<ZoneKey, string> = {
  A: "Zone A",
  B: "Zone B",
  C: "Zone C",
};

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

type ZonePriceState = "loading" | "live" | "fallback";

// Resolve what to show for a zone's price:
// - still fetching -> "loading" (render a skeleton, never a stale/zero number)
// - live shipping option found for this zone -> "live" (the real DB price)
// - fetch failed, or this zone's name wasn't in the response -> "fallback"
//   to the static ZONE_PRICES constant, visibly marked as an estimate, so
//   the section degrades gracefully instead of breaking for a public page.
function resolveZonePrice(
  zone: ZoneKey,
  livePrices: Partial<Record<ZoneKey, number>>,
  isLoading: boolean
): { amountCents: number; state: ZonePriceState } {
  if (isLoading) return { amountCents: ZONE_PRICES[zone], state: "loading" };
  const live = livePrices[zone];
  if (live !== undefined) return { amountCents: live, state: "live" };
  return { amountCents: ZONE_PRICES[zone], state: "fallback" };
}

function ZonePrice({
  zone,
  livePrices,
  isLoading,
  t,
  className,
}: {
  zone: ZoneKey;
  livePrices: Partial<Record<ZoneKey, number>>;
  isLoading: boolean;
  t: ReturnType<typeof useTranslations>;
  className?: string;
}) {
  const { amountCents, state } = resolveZonePrice(zone, livePrices, isLoading);

  if (state === "loading") {
    return (
      <span className={`inline-flex items-center ${className ?? ""}`}>
        <span
          className="inline-block h-[1em] w-14 animate-pulse rounded bg-lb-line align-middle"
          aria-hidden
        />
        <span className="sr-only">{t("priceLoading")}</span>
      </span>
    );
  }

  return (
    <span className={className}>
      {t("priceAmount", { price: amountCents / 100 })}
      {state === "fallback" && (
        <span className="ml-1 text-xs font-normal text-lb-muted">
          {t("tiers.estimatedNote")}
        </span>
      )}
    </span>
  );
}

export default function DeliveryCheckSection() {
  const t = useTranslations("HomeRedesign.deliveryCheck");
  const [query, setQuery] = useState("");
  // A match found while typing is shown immediately; a "not found" state only
  // appears once the user actually submits, so we don't flash an error on
  // every keystroke before a full area name has been typed.
  const [hasSearched, setHasSearched] = useState(false);

  // Live per-zone prices, fetched the same way checkout does (get-or-create
  // cart + fetch shipping options), but through its own query/key so this
  // homepage section never shares cache lifecycle with the real checkout flow.
  const { data: shippingOptions, isLoading: pricesLoading } = useDeliveryZonePricesQuery();

  const livePrices: Partial<Record<ZoneKey, number>> = {};
  if (shippingOptions) {
    for (const zone of ZONES) {
      const option = shippingOptions.find((o) => o.name.includes(ZONE_NAME_FRAGMENT[zone]));
      if (option) livePrices[zone] = option.amount;
    }
  }

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
                <ZonePrice
                  zone={match.zone}
                  livePrices={livePrices}
                  isLoading={pricesLoading}
                  t={t}
                  className="mt-1 text-2xl font-black text-lb-navy"
                />
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
            return (
              <div
                key={zone}
                className={`border border-lb-line bg-white px-6 py-6 ${TIER_STYLES[zone].card}`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full ${TIER_STYLES[zone].dot}`}
                  aria-hidden
                />
                <ZonePrice
                  zone={zone}
                  livePrices={livePrices}
                  isLoading={pricesLoading}
                  t={t}
                  className="mt-4 block text-3xl font-black text-lb-navy"
                />
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
            return (
              <div key={zone}>
                <h3 className="mb-4 flex items-baseline gap-1.5 text-base font-bold text-lb-navy">
                  <ZonePrice zone={zone} livePrices={livePrices} isLoading={pricesLoading} t={t} />
                  <span className="font-normal text-lb-muted">
                    {t("tiers.groupTitle", { count: areas.length })}
                  </span>
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
