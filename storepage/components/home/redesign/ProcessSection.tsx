import { useTranslations } from "next-intl";
import SectionHeader from "./SectionHeader";
import { CONTAINER, SECTION_IDS } from "./layout";

const STEPS = ["received", "hub", "routed", "delivered"] as const;

export default function ProcessSection() {
  const t = useTranslations("HomeRedesign.process");

  return (
    <section id={SECTION_IDS.process} className="scroll-mt-20 bg-lb-paper py-16 lg:py-24">
      <div className={CONTAINER}>
        <SectionHeader title={t("title")} description={t("description")} />

        <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {STEPS.map((key, index) => (
            <li
              key={key}
              className="lg:px-8 lg:first:pl-0 lg:last:pr-0 lg:border-l lg:first:border-l-0 border-lb-line"
            >
              <span className="text-sm font-bold tabular-nums text-lb-red">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 text-lg lg:text-xl font-bold text-lb-navy">
                {t(`steps.${key}.title`)}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-lb-muted">
                {t(`steps.${key}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
