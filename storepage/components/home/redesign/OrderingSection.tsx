import { useTranslations } from "next-intl";
import SectionHeader from "./SectionHeader";
import { CONTAINER, SECTION_IDS } from "./layout";

const COLUMNS = [
  { key: "order", items: ["b1", "b2", "b3", "b4", "b5"] },
  { key: "payment", items: ["b1", "b2", "b3", "b4"] },
  { key: "delivery", items: ["b1", "b2", "b3", "b4"] },
] as const;

type Column = (typeof COLUMNS)[number];

// Each column only lists its own items, so this key always exists in the messages
function itemKey(column: Column, item: Column["items"][number]) {
  return `columns.${column.key}.items.${item}` as `columns.${Column["key"]}.items.b1`;
}

export default function OrderingSection() {
  const t = useTranslations("HomeRedesign.ordering");

  return (
    <section id={SECTION_IDS.ordering} className="scroll-mt-20 py-16 lg:py-24">
      <div className={CONTAINER}>
        <SectionHeader title={t("title")} description={t("description")} />

        <div className="grid gap-12 md:grid-cols-3 md:gap-10 lg:gap-14">
          {COLUMNS.map((column) => (
            <div key={column.key}>
              <h3 className="pb-5 mb-6 border-b border-lb-line text-xl font-bold text-lb-navy">
                {t(`columns.${column.key}.title`)}
              </h3>
              <ul className="space-y-5">
                {column.items.map((item) => (
                  <li
                    key={item}
                    className="relative pl-6 text-base leading-relaxed text-lb-muted"
                  >
                    <span
                      className="absolute left-0 top-[0.6em] w-2 h-2 bg-lb-navy"
                      aria-hidden
                    />
                    {t(itemKey(column, item))}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
