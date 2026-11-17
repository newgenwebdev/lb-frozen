import { useTranslations } from "next-intl";
import SectionHeader from "./SectionHeader";
import { CONTAINER, SECTION_IDS } from "./layout";

const CUSTOMER_TYPES = [
  "restaurants",
  "steamboat",
  "cafes",
  "minimarts",
  "canteens",
  "catering",
  "resellers",
  "retail",
] as const;

// TODO: confirm figures with the business (taken from the redesign mockup)
const STATS = [
  { key: "founded", value: "2005" },
  { key: "items", value: "400+" },
  { key: "years", value: "20+" },
  { key: "clients", value: "300+" },
] as const;

export default function CustomersSection() {
  const t = useTranslations("HomeRedesign.customers");

  return (
    <section id={SECTION_IDS.customers} className="scroll-mt-20 py-16 lg:py-24">
      <div className={CONTAINER}>
        <SectionHeader title={t("title")} description={t("description")} />

        <ul className="flex flex-wrap gap-3 lg:gap-4">
          {CUSTOMER_TYPES.map((key) => (
            <li
              key={key}
              className="px-5 lg:px-7 py-3 lg:py-4 bg-white border border-lb-line text-base lg:text-lg text-lb-muted"
            >
              {t(`types.${key}`)}
            </li>
          ))}
        </ul>

        <dl className="mt-14 lg:mt-20 pt-12 lg:pt-16 border-t border-lb-line grid grid-cols-2 gap-y-10 lg:grid-cols-4">
          {STATS.map(({ key, value }) => (
            // Label is the <dt> but sits below the number visually
            <div key={key} className="flex flex-col-reverse">
              <dt className="mt-3 text-sm lg:text-base text-lb-muted">
                {t(`stats.${key}`)}
              </dt>
              <dd className="text-4xl lg:text-5xl font-black tabular-nums text-lb-navy">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
