import { useTranslations } from "next-intl";
import SectionHeader from "./SectionHeader";
import { CONTAINER, SECTION_IDS } from "./layout";

export default function AboutSection() {
  const t = useTranslations("HomeRedesign.about");

  return (
    <section id={SECTION_IDS.about} className="scroll-mt-20 bg-lb-paper py-16 lg:py-24">
      <div className={CONTAINER}>
        <SectionHeader title={t("title")} />

        <div className="max-w-3xl space-y-6">
          <p className="text-xl lg:text-2xl leading-relaxed text-lb-navy">{t("lead")}</p>
          <p className="text-base lg:text-lg leading-loose text-lb-muted">{t("story1")}</p>
          <p className="text-base lg:text-lg leading-loose text-lb-muted">{t("story2")}</p>
        </div>
      </div>
    </section>
  );
}
