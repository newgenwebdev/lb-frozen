import { useTranslations } from "next-intl";
import { COMPANY, telUrl, whatsappUrl } from "@/lib/data/company";
import SectionHeader from "./SectionHeader";
import { CONTAINER, SECTION_IDS } from "./layout";

const linkClass =
  "border-b border-lb-navy-line hover:border-white transition-colors";

export default function ContactSection() {
  const t = useTranslations("HomeRedesign.contact");

  const infoRows = [
    { label: t("info.registeredName"), value: COMPANY.registeredName },
    { label: t("info.registrationNo"), value: COMPANY.registrationNo },
    { label: t("info.warehouse"), value: t("info.warehouseValue") },
    { label: t("info.deliveryArea"), value: t("info.deliveryAreaValue") },
    { label: t("info.payment"), value: t("info.paymentValue") },
  ];

  return (
    <footer id={SECTION_IDS.contact} className="scroll-mt-20 bg-lb-navy text-white">
      <div className={`${CONTAINER} py-16 lg:py-24`}>
        <SectionHeader title={t("title")} description={t("description")} tone="dark" />

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Contact details */}
          <dl className="space-y-9">
            <div>
              <dt className="text-sm text-white/55">{t("phone")}</dt>
              <dd className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-xl lg:text-2xl">
                <a href={telUrl()} className={linkClass}>
                  {COMPANY.phone}
                </a>
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-lb-sky hover:text-white transition-colors"
                >
                  WhatsApp →
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-white/55">{t("email")}</dt>
              <dd className="mt-2 text-xl lg:text-2xl break-all">
                <a href={`mailto:${COMPANY.email}`} className={linkClass}>
                  {COMPANY.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-white/55">{t("warehouse")}</dt>
              <dd className="mt-2 text-lg lg:text-xl leading-relaxed max-w-md">
                {COMPANY.address}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-white/55">{t("hours")}</dt>
              <dd className="mt-2 text-lg lg:text-xl leading-relaxed">
                {t("hoursOpen")}
                <br />
                {t("hoursClosed")}
              </dd>
            </div>
          </dl>

          {/* Company info card */}
          <div className="self-start bg-white text-lb-navy p-6 lg:p-8">
            <dl>
              {infoRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-6 py-4 border-b border-lb-line first:border-t"
                >
                  <dt className="text-sm text-lb-muted shrink-0">{row.label}</dt>
                  <dd className="text-sm font-bold text-right">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="border-t border-lb-navy-line">
        <div
          // Bottom/right padding keeps the text clear of the floating quote-list button
          className={`${CONTAINER} pt-8 pb-24 md:pb-8 md:pr-28 flex flex-col gap-2 text-sm text-white/60 md:flex-row md:items-center md:justify-between`}
        >
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p>{t("tagline")}</p>
        </div>
      </div>
    </footer>
  );
}
